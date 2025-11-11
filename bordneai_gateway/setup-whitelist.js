#!/usr/bin/env node
// setup-whitelist.js - Populate DNS whitelist with default domains
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const WHITELIST_FILE_PATH = '/data/dns_whitelist.json';

// Default domains to whitelist
const defaultDomains = [
    'startme.com',
    'bordne.com',
    'icloud.com',
    'apple.com',
    'amazon.com',
    'chat.avatar.ext.hp.com',
    'googleapis.com',
    'tesla.com',
    'teslamotors.com',
    'sg.vzwfemto.com',
    'izatcloud.net',
    'pool.ntp.org'
];

// Load existing whitelist or create new one
let dnsWhitelist = [];
try {
    if (fs.existsSync(WHITELIST_FILE_PATH)) {
        dnsWhitelist = JSON.parse(fs.readFileSync(WHITELIST_FILE_PATH));
        console.log('[INFO] Loaded existing whitelist with', dnsWhitelist.length, 'entries');
    }
} catch (error) {
    console.error('[ERROR] Error loading whitelist:', error);
    dnsWhitelist = [];
}

// Add domains that don't already exist
let addedCount = 0;
defaultDomains.forEach(domain => {
    const exists = dnsWhitelist.some(item => item.domain === domain);
    if (!exists) {
        const newEntry = {
            id: uuidv4(),
            domain: domain,
            addedAt: Date.now(),
            addedBy: 'setup-script'
        };
        dnsWhitelist.push(newEntry);
        console.log('[ADDED]', domain);
        addedCount++;
    } else {
        console.log('[SKIP]', domain, '- already exists');
    }
});

// Save whitelist
try {
    fs.writeFileSync(WHITELIST_FILE_PATH, JSON.stringify(dnsWhitelist, null, 2));
    console.log('\n[SUCCESS] Whitelist saved successfully!');
    console.log('Total entries:', dnsWhitelist.length);
    console.log('Newly added:', addedCount);
} catch (error) {
    console.error('[ERROR] Error saving whitelist:', error);
    process.exit(1);
}
