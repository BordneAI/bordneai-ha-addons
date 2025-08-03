FROM ghcr.io/home-assistant/base:3.19

LABEL maintainer="David Charels Bordne <BordneAI@Bordne.com>"

# Install Node.js (18.x LTS)
RUN apk add --no-cache nodejs npm

# Copy all files
COPY . /usr/src/app

WORKDIR /usr/src/app

RUN npm ci --production

EXPOSE 1111

CMD [ "/usr/src/app/run.sh" ]
