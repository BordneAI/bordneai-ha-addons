#!/usr/bin/with-contenv bashio

bashio::log.info "Preparing to start BordneAI Gateway..."

# Ensure the /data directory is available for session persistence
if [ ! -d "/data" ]; then
    bashio::log.warning "Data directory not found. Creating..."
    mkdir -p /data
fi

bashio::log.info "Starting BordneAI Gateway server..."
npm start
