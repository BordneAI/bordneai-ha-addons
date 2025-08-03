#!/usr/bin/with-contenv bashio

bashio::log.info "Preparing to start BordneAI Gateway..."

# Ensure the /data directory is available for session persistence
if [ ! -d "/data" ]; then
    bashio::log.info "Data directory not found. Creating..."
    mkdir -p /data
fi

# Navigate to the application directory
cd /usr/src/app

bashio::log.info "Starting BordneAI Gateway server..."
npm start