ARG BUILD_FROM
# Multi-stage build: Get Node.js from official image
FROM node:20-alpine3.19 AS nodejs

# Main build stage
FROM ${BUILD_FROM}

# Copy only Node.js and npm binaries (not entire directories)
COPY --from=nodejs /usr/local/bin/node /usr/local/bin/node
COPY --from=nodejs /usr/local/bin/npm /usr/local/bin/npm
COPY --from=nodejs /usr/local/bin/npx /usr/local/bin/npx

# Copy Node.js libraries (be selective to avoid overwriting system files)
COPY --from=nodejs /usr/local/lib/node_modules /usr/local/lib/node_modules

# Create symlinks for backwards compatibility
RUN ln -s /usr/local/bin/node /usr/bin/node && \
    ln -s /usr/local/bin/npm /usr/bin/npm && \
    ln -s /usr/local/bin/npx /usr/bin/npx

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
