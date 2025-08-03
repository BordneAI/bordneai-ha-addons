# Use the official Home Assistant build arguments
ARG BUILD_FROM
FROM ${BUILD_FROM}

# Set shell to bash for better scripting
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install Node.js 18.x LTS, npm, and build dependencies
RUN apk add --no-cache \
    nodejs-lts \
    npm \
    python3 \
    make \
    g++

# Set up the working directory inside the container
WORKDIR /usr/src/app

# Copy package files and install production dependencies
# This leverages Docker layer caching for faster subsequent builds
COPY package.json ./
RUN npm install --omit=dev

# Copy package files and install dependencies
# This leverages Docker layer caching to speed up builds
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-optional --no-fund --no-audit

# Copy the rest of the application source code
COPY . .

# Make the run script executable
RUN chmod a+x /usr/src/app/run.sh

# Set the command to run when the container starts
CMD [ "/usr/src/app/run.sh" ]

# Add labels
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