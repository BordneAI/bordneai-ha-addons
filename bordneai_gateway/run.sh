#!/bin/sh

echo "[INFO] Preparing to start BordneAI Gateway..."

# Ensure the /data directory exists for session persistence
[ -d /data ] || mkdir -p /data

echo "[INFO] Starting BordneAI Gateway server..."
cd /usr/src/app
npm start
