ARG BUILD_FROM
FROM ${BUILD_FROM}

# Use alternative Alpine mirrors for better reliability
RUN \
    echo "http://dl-4.alpinelinux.org/alpine/v3.19/main" > /etc/apk/repositories && \
    echo "http://dl-4.alpinelinux.org/alpine/v3.19/community" >> /etc/apk/repositories && \
    echo "http://dl-5.alpinelinux.org/alpine/v3.19/main" >> /etc/apk/repositories && \
    echo "http://dl-5.alpinelinux.org/alpine/v3.19/community" >> /etc/apk/repositories

# Install Node.js and npm with alternative mirrors
RUN \
    apk add --no-cache nodejs npm

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
