# Use a minimal Node.js base image (Home Assistant official)
FROM ghcr.io/hassio-addons/base-nodejs:16

LABEL maintainer="David Charels Bordne <BordneAI@Bordne.com>"

# Copy all files from this folder into the container
COPY . /usr/src/app

WORKDIR /usr/src/app

# Install only production dependencies
RUN npm ci --production

# Expose the HTTP port
EXPOSE 1111

# Entrypoint: start the add-on
CMD [ "/usr/src/app/run.sh" ]
