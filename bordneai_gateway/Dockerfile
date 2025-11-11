ARG BUILD_FROM
# Multi-stage build: Get Node.js from official image
FROM node:20-alpine3.19 AS nodejs

# Main build stage
FROM ${BUILD_FROM}

# Copy Node.js binaries and complete runtime from nodejs image
COPY --from=nodejs /usr/local/bin/node /usr/local/bin/node
COPY --from=nodejs /usr/local/bin/npm /usr/local/bin/npm
COPY --from=nodejs /usr/local/bin/npx /usr/local/bin/npx

# Copy complete Node.js library structure (includes npm internals)
COPY --from=nodejs /usr/local/lib/node_modules /usr/local/lib/node_modules

# Copy shared libraries that Node.js depends on
COPY --from=nodejs /usr/lib/libstdc++.so.6 /usr/lib/libstdc++.so.6
COPY --from=nodejs /usr/lib/libgcc_s.so.1 /usr/lib/libgcc_s.so.1

# Create symlinks for backwards compatibility
RUN ln -sf /usr/local/bin/node /usr/bin/node && \
    ln -sf /usr/local/bin/npm /usr/bin/npm && \
    ln -sf /usr/local/bin/npx /usr/bin/npx

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
