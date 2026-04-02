// bordneai-gateway.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', false);
app.use(express.json({ limit: '100kb' }));

const PORT = 1111;
const SESSION_TTL_MS = 5 * 60 * 1000;

const ALLOWED_INGRESS_IPS = new Set([
  '172.30.32.2',
  '::ffff:172.30.32.2',
  '127.0.0.1',
  '::1'
]);

const OPTIONS_FILE_PATH = '/data/options.json';
const SESSIONS_FILE_PATH = '/data/sessions.json';
const WHITELIST_FILE_PATH = '/data/dns_whitelist.json';

let optionsConfig = {
  adguard_url: '',
  adguard_username: '',
  adguard_password: '',
  admin_users: ''
};

let sessions = {};
let dnsWhitelist = [];

loadOptions();
loadSessions();
loadWhitelist();
cleanupSessionsOnBoot();

function loadOptions() {
  try {
    if (!fs.existsSync(OPTIONS_FILE_PATH)) {
      return;
    }

    const options = JSON.parse(fs.readFileSync(OPTIONS_FILE_PATH, 'utf8'));
    optionsConfig = {
      adguard_url: options.adguard_url || '',
      adguard_username: options.adguard_username || '',
      adguard_password: options.adguard_password || '',
      admin_users: options.admin_users || ''
    };

    if (optionsConfig.adguard_url) {
      console.log('[INIT] AdGuard Home integration enabled:', optionsConfig.adguard_url);
    }
  } catch (error) {
    console.error('[INIT] Error loading options.json:', error);
  }
}

function loadSessions() {
  try {
    if (!fs.existsSync(SESSIONS_FILE_PATH)) {
      return;
    }

    sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE_PATH, 'utf8'));
    console.log('[INIT] Successfully loaded sessions from file.');
  } catch (error) {
    console.error('[INIT] Error loading sessions.json:', error);
    sessions = {};
  }
}

function loadWhitelist() {
  try {
    if (!fs.existsSync(WHITELIST_FILE_PATH)) {
      return;
    }

    dnsWhitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE_PATH, 'utf8'));
    console.log('[INIT] Successfully loaded DNS whitelist from file.');
  } catch (error) {
    console.error('[INIT] Error loading dns_whitelist.json:', error);
    dnsWhitelist = [];
  }
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(sessions, null, 2));
  } catch (error) {
    console.error('[SAVE] Error saving sessions.json:', error);
  }
}

function saveWhitelist() {
  try {
    fs.writeFileSync(WHITELIST_FILE_PATH, JSON.stringify(dnsWhitelist, null, 2));
  } catch (error) {
    console.error('[SAVE] Error saving dns_whitelist.json:', error);
  }
}

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function getAdminUsersSet() {
  return new Set(
    String(optionsConfig.admin_users || '')
      .split(',')
      .map(normalizeIdentity)
      .filter(Boolean)
  );
}

function getRemoteUser(req) {
  return {
    id: req.get('X-Remote-User-Id') || '',
    name: req.get('X-Remote-User-Name') || '',
    displayName: req.get('X-Remote-User-Display-Name') || ''
  };
}

function getRemoteUserKeys(req) {
  const user = getRemoteUser(req);
  return [user.id, user.name, user.displayName]
    .map(normalizeIdentity)
    .filter(Boolean);
}

function getRemoteUserLabel(req) {
  const user = getRemoteUser(req);
  return user.displayName || user.name || user.id || 'unknown';
}

function hasAuthenticatedIngressUser(req) {
  const user = getRemoteUser(req);
  return Boolean(user.id || user.name || user.displayName);
}

function isManagementUser(req) {
  const adminUsers = getAdminUsersSet();
  if (adminUsers.size === 0) {
    return false;
  }

  return getRemoteUserKeys(req).some((value) => adminUsers.has(value));
}

function canAccessSession(req, session) {
  if (isManagementUser(req)) {
    return true;
  }

  const requestKeys = new Set(getRemoteUserKeys(req));
  const sessionKeys = [
    session.createdById,
    session.createdByName,
    session.createdByDisplayName
  ]
    .map(normalizeIdentity)
    .filter(Boolean);

  return sessionKeys.some((value) => requestKeys.has(value));
}

function cleanupSessionsOnBoot() {
  let changed = false;
  const now = Date.now();

  for (const [sessionId, session] of Object.entries(sessions)) {
    if (session && Object.prototype.hasOwnProperty.call(session, 'token')) {
      delete session.token;
      changed = true;
    }

    if (session?.status === 'pending' && now - Number(session.createdAt || 0) > SESSION_TTL_MS) {
      delete sessions[sessionId];
      changed = true;
      continue;
    }

    if (session?.status === 'approved' && !session.approvedAt) {
      session.approvedAt = session.createdAt || now;
      changed = true;
    }
  }

  if (changed) {
    saveSessions();
  }
}

function schedulePendingSessionExpiry(sessionId) {
  setTimeout(() => {
    const session = sessions[sessionId];
    if (session?.status === 'pending') {
      delete sessions[sessionId];
      saveSessions();
      console.log(`[SESSION] Expired pending session ${sessionId}`);
    }
  }, SESSION_TTL_MS);
}

function requireIngress(req, res, next) {
  const remoteAddress = req.socket.remoteAddress;
  if (ALLOWED_INGRESS_IPS.has(remoteAddress)) {
    return next();
  }

  return res.status(403).json({ error: 'Ingress only' });
}

function requireAuthenticatedUser(req, res, next) {
  if (!hasAuthenticatedIngressUser(req)) {
    return res.status(401).json({ error: 'Missing Home Assistant ingress user headers' });
  }

  return next();
}

function requireManagementUser(req, res, next) {
  const adminUsers = getAdminUsersSet();

  if (adminUsers.size === 0) {
    return res.status(503).json({
      error: 'Configure the admin_users option with your Home Assistant username or user ID first'
    });
  }

  if (!isManagementUser(req)) {
    return res.status(403).json({ error: 'Management access denied' });
  }

  return next();
}

app.use(requireIngress);
app.use('/api', requireAuthenticatedUser);

// --- ADGUARD HOME API INTEGRATION ---
function getAdGuardAuthHeader() {
  if (!optionsConfig.adguard_username || !optionsConfig.adguard_password) {
    return {};
  }

  const credentials = Buffer.from(
    `${optionsConfig.adguard_username}:${optionsConfig.adguard_password}`
  ).toString('base64');

  return {
    Authorization: `Basic ${credentials}`
  };
}

async function syncToAdGuardHome() {
  if (!optionsConfig.adguard_url) {
    console.log('[AdGuard] Integration not configured, skipping sync');
    return { success: false, message: 'AdGuard Home not configured' };
  }

  try {
    const getRulesResponse = await fetch(`${optionsConfig.adguard_url}/control/filtering/status`, {
      headers: getAdGuardAuthHeader()
    });

    if (!getRulesResponse.ok) {
      throw new Error(`Failed to get AdGuard Home rules: ${getRulesResponse.statusText}`);
    }

    const filteringStatus = await getRulesResponse.json();
    let currentRules = filteringStatus.user_rules || [];

    currentRules = currentRules.filter(
      (rule) => !rule.startsWith('@@||') || !rule.includes('! BordneAI')
    );

    const whitelistRules = dnsWhitelist.map(
      (entry) => `@@||${entry.domain}^$important ! BordneAI Whitelist`
    );

    const updatedRules = [...currentRules, ...whitelistRules];

    const setRulesResponse = await fetch(`${optionsConfig.adguard_url}/control/filtering/set_rules`, {
      method: 'POST',
      headers: {
        ...getAdGuardAuthHeader(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rules: updatedRules })
    });

    if (!setRulesResponse.ok) {
      throw new Error(`Failed to update AdGuard Home rules: ${setRulesResponse.statusText}`);
    }

    console.log(`[AdGuard] Successfully synced ${dnsWhitelist.length} domains to AdGuard Home`);
    return { success: true, message: 'Synced to AdGuard Home' };
  } catch (error) {
    console.error('[AdGuard] Error syncing to AdGuard Home:', error);
    return { success: false, message: error.message };
  }
}

async function addDomainToAdGuard() {
  if (!optionsConfig.adguard_url) {
    return { success: false, message: 'AdGuard Home not configured' };
  }

  return syncToAdGuardHome();
}

async function removeDomainFromAdGuard() {
  if (!optionsConfig.adguard_url) {
    return { success: false, message: 'AdGuard Home not configured' };
  }

  return syncToAdGuardHome();
}

// --- HOME ASSISTANT INTERNAL COMMUNICATION ---
const HA_SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_API_URL = 'http://supervisor/core/api';

// --- REAL-TIME REVOCATION VIA WEBSOCKET ---
function connectToHaWebsocket() {
  if (!HA_SUPERVISOR_TOKEN) {
    return;
  }

  const wsUrl = HA_API_URL.replace('http', 'ws') + '/websocket';
  const ws = new WebSocket(wsUrl, {
    headers: {
      Authorization: `Bearer ${HA_SUPERVISOR_TOKEN}`
    }
  });

  let callId = 1;

  ws.on('open', () => {
    console.log('[HA WS] Backend WebSocket connected to Home Assistant Core.');
    ws.send(
      JSON.stringify({
        id: callId++,
        type: 'subscribe_events',
        event_type: 'bordneai_revoke_device_event'
      })
    );
  });

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'event' && data.event?.event_type === 'bordneai_revoke_device_event') {
        const tokenToRevoke = data.event.data?.token_to_revoke;
        const sessionId = data.event.data?.session_id;
        await revokeSession({ sessionId, tokenToRevoke });
      }
    } catch (error) {
      console.error('[HA WS] Failed to process message:', error);
    }
  });

  ws.on('close', () => {
    console.warn('[HA WS] Backend WebSocket disconnected. Reconnecting in 5 seconds...');
    setTimeout(connectToHaWebsocket, 5000);
  });

  ws.on('error', (err) => {
    console.error('[HA WS] Backend WebSocket error:', err);
  });
}

async function revokeSession({ sessionId, tokenToRevoke } = {}) {
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
    saveSessions();
    console.log(`[REVOKE] Session ${sessionId} removed from internal store.`);
    return true;
  }

  if (tokenToRevoke) {
    const match = Object.entries(sessions).find(([, session]) => session.token === tokenToRevoke);
    if (match) {
      delete sessions[match[0]];
      saveSessions();
      console.log(`[REVOKE] Session ${match[0]} removed by legacy token lookup.`);
      return true;
    }
  }

  return false;
}

function makeSessionView(sessionId, session) {
  return {
    sessionId,
    status: session.status,
    deviceName: session.deviceName || session.userAgent || 'Unknown device',
    createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
    approvedAt: session.approvedAt ? new Date(session.approvedAt).toISOString() : null,
    createdBy: session.createdByDisplayName || session.createdByName || session.createdById || null,
    approvedBy: session.approvedBy || null
  };
}

// --- API ENDPOINTS ---
app.get('/api/onboarding/init', (req, res) => {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const sessionId = uuidv4();
  const remoteUser = getRemoteUser(req);
  const userAgent = req.get('User-Agent') || 'Unknown device';

  sessions[sessionId] = {
    code,
    status: 'pending',
    ip: req.socket.remoteAddress,
    userAgent,
    deviceName: userAgent.substring(0, 80),
    createdAt: Date.now(),
    createdById: remoteUser.id || null,
    createdByName: remoteUser.name || null,
    createdByDisplayName: remoteUser.displayName || null,
    approvedAt: null,
    approvedBy: null
  };

  saveSessions();
  schedulePendingSessionExpiry(sessionId);

  res.json({
    code,
    sessionId,
    expiresInMs: SESSION_TTL_MS
  });
});

app.get('/api/onboarding/status', (req, res) => {
  const sessionId = String(req.query.sessionId || '').trim();
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId is required' });
  }

  const session = sessions[sessionId];
  if (!session) {
    return res.status(404).json({ status: 'expired' });
  }

  if (!canAccessSession(req, session)) {
    return res.status(403).json({ error: 'Not allowed to view this session' });
  }

  if (session.status === 'approved') {
    session.status = 'completed';
    session.completedAt = Date.now();
    saveSessions();

    return res.json({
      status: 'approved',
      sessionId,
      deviceName: session.deviceName,
      approvedAt: session.approvedAt ? new Date(session.approvedAt).toISOString() : null
    });
  }

  return res.json({ status: session.status });
});

app.post('/api/onboarding/approve', requireManagementUser, (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  if (!code) {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const sessionEntry = Object.entries(sessions).find(
    ([, session]) => session.code === code && session.status === 'pending'
  );

  if (!sessionEntry) {
    return res.status(400).json({ error: 'Invalid or expired code.' });
  }

  const [sessionId, session] = sessionEntry;
  delete session.token;
  session.status = 'approved';
  session.approvedAt = Date.now();
  session.approvedBy = getRemoteUserLabel(req);

  saveSessions();

  return res.json({
    success: true,
    sessionId,
    deviceName: session.deviceName
  });
});

app.get('/api/sessions', requireManagementUser, (req, res) => {
  const activeSessions = Object.entries(sessions)
    .filter(([, session]) => ['approved', 'completed'].includes(session.status))
    .map(([sessionId, session]) => makeSessionView(sessionId, session));

  res.json(activeSessions);
});

app.post('/api/onboarding/revoke', requireManagementUser, async (req, res) => {
  const sessionId = String(req.body?.sessionId || '').trim();
  const tokenToRevoke = String(req.body?.token_to_revoke || '').trim();

  if (!sessionId && !tokenToRevoke) {
    return res.status(400).json({ error: 'sessionId is required.' });
  }

  if (await revokeSession({ sessionId, tokenToRevoke })) {
    return res.json({ success: true, message: 'Revocation processed.' });
  }

  return res.status(404).json({ error: 'Session not found.' });
});

// --- DNS WHITELIST API ENDPOINTS ---
app.get('/api/whitelist', requireManagementUser, (req, res) => {
  res.json(dnsWhitelist);
});

app.post('/api/whitelist/add', requireManagementUser, async (req, res) => {
  const domain = String(req.body?.domain || '').trim().toLowerCase();
  if (!domain) {
    return res.status(400).json({ error: 'Domain is required.' });
  }

  const domainRegex = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  if (!domainRegex.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain format.' });
  }

  if (dnsWhitelist.some((item) => item.domain === domain)) {
    return res.status(400).json({ error: 'Domain already exists in whitelist.' });
  }

  const newEntry = {
    id: uuidv4(),
    domain,
    addedAt: Date.now(),
    addedBy: getRemoteUserLabel(req)
  };

  dnsWhitelist.push(newEntry);
  saveWhitelist();

  const adguardResult = await addDomainToAdGuard(domain);
  res.json({ success: true, entry: newEntry, adguard: adguardResult });
});

app.post('/api/whitelist/remove', requireManagementUser, async (req, res) => {
  const id = String(req.body?.id || '').trim();
  if (!id) {
    return res.status(400).json({ error: 'ID is required.' });
  }

  const index = dnsWhitelist.findIndex((item) => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Domain not found in whitelist.' });
  }

  const domain = dnsWhitelist[index].domain;
  dnsWhitelist.splice(index, 1);
  saveWhitelist();

  const adguardResult = await removeDomainFromAdGuard(domain);
  res.json({ success: true, message: 'Domain removed from whitelist.', adguard: adguardResult });
});

app.post('/api/whitelist/clear', requireManagementUser, async (req, res) => {
  dnsWhitelist = [];
  saveWhitelist();

  const adguardResult = await syncToAdGuardHome();
  res.json({ success: true, message: 'Whitelist cleared.', adguard: adguardResult });
});

// --- SERVER START ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, async () => {
  console.log(`BordneAI Gateway started on port ${PORT}.`);

  if (HA_SUPERVISOR_TOKEN) {
    connectToHaWebsocket();
  } else {
    console.error('CRITICAL: SUPERVISOR_TOKEN not found. Real-time revocation will not work.');
  }

  if (optionsConfig.adguard_url) {
    console.log('[AdGuard] Performing initial sync on startup...');
    const syncResult = await syncToAdGuardHome();
    if (syncResult.success) {
      console.log('[AdGuard] Initial sync completed successfully');
    } else {
      console.error('[AdGuard] Initial sync failed:', syncResult.message);
    }
  }
});