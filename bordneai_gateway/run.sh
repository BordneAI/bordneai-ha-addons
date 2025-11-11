#!/bin/sh

echo "[INFO] Preparing to start BordneAI Gateway..."

# Ensure the /data directory exists for session persistence
[ -d /data ] || mkdir -p /data

# Initialize DNS whitelist with default domains
echo "[INFO] Setting up DNS whitelist with default domains..."
cd /usr/src/app
node setup-whitelist.js

echo "[INFO] Starting BordneAI Gateway server..."
npm start
