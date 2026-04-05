ARG BUILD_FROM

# Multi-stage build: get Node.js runtime from official image
FROM node:20-alpine3.19 AS nodejs

# Main build stage
FROM ${BUILD_FROM}

# Copy Node.js binaries and runtime from nodejs image
COPY --from=nodejs /usr/local/bin/node /usr/local/bin/node
COPY --from=nodejs /usr/local/bin/npm /usr/local/bin/npm
COPY --from=nodejs /usr/local/bin/npx /usr/local/bin/npx
COPY --from=nodejs /usr/local/lib/node_modules /usr/local/lib/node_modules
COPY --from=nodejs /usr/lib/libstdc++.so.6 /usr/lib/libstdc++.so.6
COPY --from=nodejs /usr/lib/libgcc_s.so.1 /usr/lib/libgcc_s.so.1

# Create symlinks for compatibility
RUN ln -sf /usr/local/bin/node /usr/bin/node && \
    ln -sf /usr/local/bin/npm /usr/bin/npm && \
    ln -sf /usr/local/bin/npx /usr/bin/npx

# Copy application files
COPY . /usr/src/app
COPY run.sh /run.sh

WORKDIR /usr/src/app

# Install dependencies
RUN npm install --production

# Set execution permissions
RUN chmod +x /run.sh

CMD ["/run.sh"]

LABEL \
  io.hass.name="BordneAI Gateway" \
  io.hass.description="Ingress-based device onboarding, session management, and DNS whitelist control for BordneAI" \
  org.opencontainers.image.title="BordneAI Gateway" \
  org.opencontainers.image.vendor="BordneAI" \
  org.opencontainers.image.authors="David Charles Bordne" \
  org.opencontainers.image.licenses="Proprietary" \
  org.opencontainers.image.url="https://github.com/BordneAI/bordneai-ha-addons" \
  org.opencontainers.image.documentation="https://github.com/BordneAI/bordneai-ha-addons/blob/main/README.md"