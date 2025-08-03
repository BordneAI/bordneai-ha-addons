// bordneai-gateway.js - Secure Onboarding & API Gateway
// Version 1.3.0: Added session persistence and real-time revocation via HA WebSocket.

const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
const PORT = 1111;

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
    res.json(activeSessions.map(s => ({ token: s.token, deviceName: s.userAgent })));
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

// --- SERVER START ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log(`BordneAI Gateway started on port ${PORT}.`);
    if (HA_SUPERVISOR_TOKEN) {
        connectToHaWebsocket();
    } else {
        console.error("CRITICAL: SUPERVISOR_TOKEN not found. Real-time revocation will not work.");
    }
});
