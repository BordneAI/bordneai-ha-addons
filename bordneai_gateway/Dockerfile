ARG BUILD_FROM
# Multi-stage build: Get Node.js from official image
FROM node:20-alpine3.19 AS nodejs

# Main build stage
FROM ${BUILD_FROM}

# Copy Node.js and npm from the Node.js image
COPY --from=nodejs /usr/lib /usr/lib
COPY --from=nodejs /usr/local/bin /usr/local/bin
COPY --from=nodejs /usr/local/lib /usr/local/lib

# Copy application files
COPY . /usr/src/app

# Copy the startup script to root
COPY run.sh /run.sh

WORKDIR /usr/src/app

# Install dependencies
RUN npm install --production

# Set execution permissions for run.sh
RUN chmod +x /run.sh

CMD [ "/run.sh" ]


LABEL \
    io.hass.name="BordneAI Gateway" \
    io.hass.description="Secure device onboarding and dashboard for BordneAI" \
    org.opencontainers.image.title="BordneAI Gateway" \
    org.opencontainers.image.vendor="BordneAI" \
    org.opencontainers.image.authors="David Charles Bordne" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/BordneAI/bordneai-ha-addons" \
    org.opencontainers.image.documentation="https://github.com/BordneAI/bordneai-ha-addons/blob/main/README.md"
