// bordneai-gateway.js - Secure Onboarding & API Gateway
// Version 1.5.0: Includes session persistence, real-time event-based revocation, and AdGuard Home integration.

const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
const PORT = 1111;

// --- ADGUARD HOME CONFIGURATION ---
const OPTIONS_FILE_PATH = '/data/options.json';
let adguardConfig = { url: '', username: '', password: '' };

try {
    if (fs.existsSync(OPTIONS_FILE_PATH)) {
        const options = JSON.parse(fs.readFileSync(OPTIONS_FILE_PATH));
        adguardConfig = {
            url: options.adguard_url || '',
            username: options.adguard_username || '',
            password: options.adguard_password || ''
        };
        if (adguardConfig.url) {
            console.log('[INIT] AdGuard Home integration enabled:', adguardConfig.url);
        }
    }
} catch (error) {
    console.error('[INIT] Error loading AdGuard Home config:', error);
}

// --- PERSISTENT SESSION STORAGE ---
const SESSIONS_FILE_PATH = '/data/sessions.json';
let sessions = {};

try {
    if (fs.existsSync(SESSIONS_FILE_PATH)) {
        sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE_PATH));
        console.log('[INIT] Successfully loaded sessions from file.');
    }
} catch (error) {
    console.error('[INIT] Error loading sessions.json:', error);
}

function saveSessions() {
    try {
        fs.writeFileSync(SESSIONS_FILE_PATH, JSON.stringify(sessions, null, 2));
    } catch (error) {
        console.error('[SAVE] Error saving sessions.json:', error);
    }
}

// --- DNS WHITELIST STORAGE ---
const WHITELIST_FILE_PATH = '/data/dns_whitelist.json';
let dnsWhitelist = [];

try {
    if (fs.existsSync(WHITELIST_FILE_PATH)) {
        dnsWhitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE_PATH));
        console.log('[INIT] Successfully loaded DNS whitelist from file.');
    }
} catch (error) {
    console.error('[INIT] Error loading dns_whitelist.json:', error);
}

function saveWhitelist() {
    try {
        fs.writeFileSync(WHITELIST_FILE_PATH, JSON.stringify(dnsWhitelist, null, 2));
    } catch (error) {
        console.error('[SAVE] Error saving dns_whitelist.json:', error);
    }
}

// --- ADGUARD HOME API INTEGRATION ---
function getAdGuardAuthHeader() {
    if (!adguardConfig.username || !adguardConfig.password) return {};
    const credentials = Buffer.from(`${adguardConfig.username}:${adguardConfig.password}`).toString('base64');
    return { 'Authorization': `Basic ${credentials}` };
}

async function syncToAdGuardHome() {
    if (!adguardConfig.url) {
        console.log('[AdGuard] Integration not configured, skipping sync');
        return { success: false, message: 'AdGuard Home not configured' };
    }

    try {
        // Get current custom filtering rules
        const getRulesResponse = await fetch(`${adguardConfig.url}/control/filtering/status`, {
            headers: getAdGuardAuthHeader()
        });

        if (!getRulesResponse.ok) {
            throw new Error(`Failed to get AdGuard Home rules: ${getRulesResponse.statusText}`);
        }

        const filteringStatus = await getRulesResponse.json();
        let currentRules = filteringStatus.user_rules || [];

        // Remove old whitelist rules (those starting with @@||) that we manage
        currentRules = currentRules.filter(rule => !rule.startsWith('@@||') || !rule.includes('! BordneAI'));

        // Add new whitelist rules from our DNS whitelist
        const whitelistRules = dnsWhitelist.map(entry =>
            `@@||${entry.domain}^$important ! BordneAI Whitelist`
        );

        const updatedRules = [...currentRules, ...whitelistRules];

        // Update AdGuard Home with new rules
        const setRulesResponse = await fetch(`${adguardConfig.url}/control/filtering/set_rules`, {
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

async function addDomainToAdGuard(domain) {
    if (!adguardConfig.url) return { success: false };

    try {
        await syncToAdGuardHome();
        return { success: true };
    } catch (error) {
        console.error('[AdGuard] Error adding domain:', error);
        return { success: false, message: error.message };
    }
}

async function removeDomainFromAdGuard(domain) {
    if (!adguardConfig.url) return { success: false };

    try {
        await syncToAdGuardHome();
        return { success: true };
    } catch (error) {
        console.error('[AdGuard] Error removing domain:', error);
        return { success: false, message: error.message };
    }
}

// --- HOME ASSISTANT NATIVE API INTEGRATION ---
const HA_SUPERVISOR_TOKEN = process.env.SUPERVISOR_TOKEN;
const HA_API_URL = 'http://supervisor/core/api';

async function generateHaToken(deviceName) {
    if (!HA_SUPERVISOR_TOKEN) throw new Error('SUPERVISOR_TOKEN is not available.');
    
    const response = await fetch(`${HA_API_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${HA_SUPERVISOR_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'long_lived_access_token', client_name: deviceName, lifespan: 365 })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HA API Error: ${response.statusText} - ${errorBody}`);
    }
    return (await response.text()).replace(/"/g, '');
}

// --- REAL-TIME REVOCATION VIA WEBSOCKET ---
function connectToHaWebsocket() {
    const wsUrl = HA_API_URL.replace('http', 'ws') + '/websocket';
    const ws = new WebSocket(wsUrl, { headers: { 'Authorization': `Bearer ${HA_SUPERVISOR_TOKEN}` } });
    let callId = 1;

    ws.on('open', () => {
        console.log('[HA WS] Backend WebSocket connected to Home Assistant Core.');
        ws.send(JSON.stringify({ id: callId++, type: 'subscribe_events', event_type: 'bordneai_revoke_device_event' }));
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'event' && data.event.event_type === 'bordneai_revoke_device_event') {
            const { token_to_revoke } = data.event.data;
            console.log(`[HA WS] Received event to revoke token.`);
            revokeToken(token_to_revoke);
        }
    });

    ws.on('close', () => {
        console.warn('[HA WS] Backend WebSocket disconnected. Reconnecting in 5 seconds...');
        setTimeout(connectToHaWebsocket, 5000);
    });

    ws.on('error', (err) => console.error('[HA WS] Backend WebSocket error:', err));
}

async function revokeToken(tokenToRevoke) {
    if (!tokenToRevoke) return false;
    const sessionEntry = Object.entries(sessions).find(([, s]) => s.token === tokenToRevoke);
    if (sessionEntry) {
        const [sessionId] = sessionEntry;
        delete sessions[sessionId];
        saveSessions();
        console.log(`[REVOKE] Session ${sessionId} removed from internal store.`);
        return true;
    }
    return false;
}

// --- API ENDPOINTS ---
app.get('/api/onboarding/init', (req, res) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const sessionId = uuidv4();
    sessions[sessionId] = { code, status: 'pending', ip: req.ip, userAgent: req.get('User-Agent'), createdAt: Date.now(), token: null };
    saveSessions();
    setTimeout(() => {
        if (sessions[sessionId]?.status === 'pending') {
            delete sessions[sessionId];
            saveSessions();
        }
    }, 300000);
    res.json({ code, sessionId });
});

app.get('/api/onboarding/status', (req, res) => {
    const { sessionId } = req.query;
    const session = sessions[sessionId];
    if (!session) return res.status(404).json({ status: 'expired' });
    if (session.status === 'approved' && session.token) {
        const { token } = session;
        session.status = 'completed';
        saveSessions();
        res.json({ status: 'approved', token });
    } else {
        res.json({ status: 'pending' });
    }
});

app.post('/api/onboarding/approve', async (req, res) => {
    const { code } = req.body;
    const sessionEntry = Object.entries(sessions).find(([, s]) => s.code === code && s.status === 'pending');
    if (!sessionEntry) return res.status(400).json({ error: 'Invalid or expired code.' });
    
    const [sessionId, session] = sessionEntry;
    try {
        const deviceName = `BordneAI - ${session.userAgent.substring(0, 30)}`;
        session.token = await generateHaToken(deviceName);
        session.status = 'approved';
        saveSessions();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Token generation failed.' });
    }
});

app.get('/api/sessions', (req, res) => {
    const activeSessions = Object.values(sessions).filter(s => s.status === 'completed');
    res.json(activeSessions.map(s => ({ token: s.token, deviceName: s.userAgent, onboardedAt: new Date(s.createdAt).toLocaleString() })));
});

app.post('/api/onboarding/revoke', async (req, res) => {
    const { token_to_revoke } = req.body;
    if (!token_to_revoke) return res.status(400).json({ error: 'Token is required.' });
    if (await revokeToken(token_to_revoke)) {
        res.json({ success: true, message: 'Revocation processed.' });
    } else {
        res.status(404).json({ error: 'Token not found in active sessions.' });
    }
});

// --- DNS WHITELIST API ENDPOINTS ---
app.get('/api/whitelist', (req, res) => {
    res.json(dnsWhitelist);
});

app.post('/api/whitelist/add', async (req, res) => {
    const { domain } = req.body;
    if (!domain) return res.status(400).json({ error: 'Domain is required.' });

    // Basic domain validation
    const domainRegex = /^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
        return res.status(400).json({ error: 'Invalid domain format.' });
    }

    // Check if domain already exists
    if (dnsWhitelist.some(item => item.domain === domain)) {
        return res.status(400).json({ error: 'Domain already exists in whitelist.' });
    }

    const newEntry = {
        id: uuidv4(),
        domain: domain,
        addedAt: Date.now(),
        addedBy: req.ip
    };

    dnsWhitelist.push(newEntry);
    saveWhitelist();

    // Sync to AdGuard Home
    const adguardResult = await addDomainToAdGuard(domain);

    res.json({
        success: true,
        entry: newEntry,
        adguard: adguardResult
    });
});

app.post('/api/whitelist/remove', async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID is required.' });

    const index = dnsWhitelist.findIndex(item => item.id === id);
    if (index === -1) {
        return res.status(404).json({ error: 'Domain not found in whitelist.' });
    }

    const domain = dnsWhitelist[index].domain;
    dnsWhitelist.splice(index, 1);
    saveWhitelist();

    // Sync to AdGuard Home
    const adguardResult = await removeDomainFromAdGuard(domain);

    res.json({
        success: true,
        message: 'Domain removed from whitelist.',
        adguard: adguardResult
    });
});

app.post('/api/whitelist/clear', async (req, res) => {
    dnsWhitelist = [];
    saveWhitelist();

    // Sync to AdGuard Home
    const adguardResult = await syncToAdGuardHome();

    res.json({
        success: true,
        message: 'Whitelist cleared.',
        adguard: adguardResult
    });
});

// --- SERVER START ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, async () => {
    console.log(`BordneAI Gateway started on port ${PORT}.`);
    if (HA_SUPERVISOR_TOKEN) {
        connectToHaWebsocket();
    } else {
        console.error("CRITICAL: SUPERVISOR_TOKEN not found. Real-time revocation will not work.");
    }

    // Initial sync to AdGuard Home on startup
    if (adguardConfig.url) {
        console.log('[AdGuard] Performing initial sync on startup...');
        const syncResult = await syncToAdGuardHome();
        if (syncResult.success) {
            console.log('[AdGuard] Initial sync completed successfully');
        } else {
            console.error('[AdGuard] Initial sync failed:', syncResult.message);
        }
    }
});