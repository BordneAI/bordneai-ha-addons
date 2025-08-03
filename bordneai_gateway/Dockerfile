# Use the stable Home Assistant Community Add-ons base image with the 'latest' tag
ARG BUILD_FROM=ghcr.io/hassio-addons/base-nodejs:20.0.0
FROM ${BUILD_FROM}

# Add build-time arguments for labels
ARG BUILD_ARCH
ARG BUILD_DATE
ARG BUILD_REF
ARG BUILD_VERSION

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# The base image already contains Node.js and npm.
# We only need to install build tools for any native npm packages.
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Set up the working directory
WORKDIR /usr/src/app

# Copy package files and install production dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy the rest of the application source code
COPY . .

# Make the run script executable
RUN chmod a+x /usr/src/app/run.sh

# Set the command to run when the container starts
CMD [ "/usr/src/app/run.sh" ]

# Add labels for metadata
LABEL \
    io.hass.name="BordneAI Gateway" \
    io.hass.description="Secure device onboarding and dashboard for BordneAI" \
    io.hass.version=${BUILD_VERSION} \
    io.hass.type="addon" \
    io.hass.arch="${BUILD_ARCH}" \
    org.opencontainers.image.title="BordneAI Gateway" \
    org.opencontainers.image.description="Secure device onboarding and dashboard for BordneAI" \
    org.opencontainers.image.vendor="BordneAI" \
    org.opencontainers.image.authors="David Charles Bordne" \
    org.opencontainers.image.licenses="MIT" \
    org.opencontainers.image.url="https://github.com/BordneAI/bordneai-ha-addons" \
    org.opencontainers.image.source="https://github.com/${BUILD_REF}" \
    org.opencontainers.image.documentation="https://github.com/BordneAI/bordneai-ha-addons/blob/main/README.md" \
    org.opencontainers.image.created=${BUILD_DATE} \
    org.opencontainers.image.version=${BUILD_VERSION} \
    org.opencontainers.image.revision=${BUILD_REF}