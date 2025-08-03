ARG BUILD_ARCH
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM ghcr.io/home-assistant/${BUILD_ARCH}-base:latest

# Install Node.js (use Alpine community package)
RUN apk add --no-cache nodejs npm

# Copy application files
COPY . /usr/src/app

WORKDIR /usr/src/app

# Install dependencies
RUN npm install --production

# Set execution permissions
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
