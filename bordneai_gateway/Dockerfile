FROM --platform=$BUILDPLATFORM ghcr.io/home-assistant/${BUILD_ARCH}-base:latest

# Install Node.js (use Alpine community package)
RUN apk add --no-cache nodejs npm python3 make g++

WORKDIR /usr/src/app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-optional --no-fund --no-audit

COPY . .

RUN chmod a+x /usr/src/app/run.sh

CMD [ "/usr/src/app/run.sh" ]


LABEL \
    io.hass.name="BordneAI Gateway" \
    io.hass.description="Secure device onboarding and dashboard for BordneAI" \
    org.opencontainers.image.title="BordneAI Gateway" \
    org.opencontainers.image.vendor="BordneAI" \
    org.opencontainers.image.authors="David Charles Bordne" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/BordneAI/bordneai-ha-addons" \
    org.opencontainers.image.documentation="https://github.com/BordneAI/bordneai-ha-addons/blob/main/README.md"
