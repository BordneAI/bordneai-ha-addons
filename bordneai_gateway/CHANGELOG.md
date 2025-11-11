# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.7] - 2025-11-11

### Fixed
- **NPM Module Resolution Fix**: Added shared C++ libraries (libstdc++, libgcc_s) required by Node.js
- Resolves "Cannot find module '../lib/cli.js'" error during npm install
- Node.js binary now has all required dependencies to run npm commands
- Changed symlinks to use `-sf` (force) flag to prevent errors on rebuild

### Changed
- Copy additional shared libraries from Node.js image: libstdc++.so.6, libgcc_s.so.1
- Improved symlink creation with force flag for idempotent builds

## [3.3.6] - 2025-11-11

### Fixed
- **CRITICAL RUNTIME FIX**: Fixed addon crash on startup caused by overwriting system files
- Changed from copying entire directories to selective file copying in multi-stage build
- Only copy Node.js-specific binaries (node, npm, npx) and libraries (node_modules)
- Preserves Home Assistant base image's shell and system utilities
- Resolves "/run.sh: not found" error by keeping /bin/sh intact
- Added symlinks for backwards compatibility (/usr/bin/node, /usr/bin/npm, /usr/bin/npx)

### Changed
- More precise COPY commands in Dockerfile to avoid system file conflicts
- Multi-stage build now surgical rather than wholesale directory replacement

## [3.3.5] - 2025-11-11

### Fixed
- **CRITICAL FIX**: Resolved persistent Alpine repository network timeouts using multi-stage Docker build
- Eliminated dependency on Alpine package repositories for Node.js installation
- Node.js and npm now copied from official `node:20-alpine3.19` image instead of being installed via `apk`
- This bypasses all network connectivity issues to Alpine CDN mirrors

### Changed
- Switched from `apk add nodejs npm` to multi-stage build with COPY from official Node.js image
- Dockerfile now uses proven multi-stage pattern recommended for Alpine + Node.js builds

## [3.3.4] - 2025-11-11

### Fixed
- **Critical Network Fix**: Replaced default Alpine CDN mirrors with alternative mirrors (dl-4, dl-5) to resolve timeout issues
- Removed retry logic and simplified package installation using reliable mirror servers
- Addresses "temporary error (try again later)" when fetching from dl-cdn.alpinelinux.org

### Changed
- Alpine repositories now use dl-4.alpinelinux.org and dl-5.alpinelinux.org mirrors
- Streamlined Dockerfile for faster and more reliable builds

## [3.3.3] - 2025-11-11

### Fixed
- **Docker Build Fix**: Corrected base image repository paths to use official Home Assistant base images with pinned Alpine 3.19 version
- Changed from inaccessible Community Add-ons base images to official HA base images
- Pinned to Alpine 3.19 for stability instead of using `:latest` tag

### Changed
- Base images now use `ghcr.io/home-assistant/{arch}-base:3.19` format

## [3.3.2] - 2025-11-11

### Fixed
- **Critical Docker Build Fix**: Switched to Home Assistant Community Add-ons base images (v15.0.8) for improved stability
- Added retry logic with exponential backoff (5s, 10s) for package installation to handle transient network issues
- Added verbose output (`set -x`) for better build debugging

### Changed
- Updated base images from official HA images to hassio-addons/base images
- Base images now use Alpine 3.19 with better package repository reliability

## [3.3.1] - 2025-11-11

### Fixed
- **Docker Build Optimization**: Improved Dockerfile package installation by separating `apk update` and `apk add` steps
- Better error handling for package installation during Docker build
- Cleaner multi-line RUN command following Home Assistant addon best practices

## [3.3.0] - 2025-11-11

### Added
- **AdGuard Home Integration**: DNS whitelist now automatically syncs with AdGuard Home in real-time
- Added optional configuration fields for AdGuard Home connection (URL, username, password)
- Automatic initial sync to AdGuard Home on addon startup
- AdGuard Home sync status reporting in API responses
- Custom filtering rules with `@@||domain^$important` format for AdGuard Home
- Preservation of non-BordneAI rules in AdGuard Home during sync

### Changed
- Updated DNS whitelist API endpoints to include AdGuard Home synchronization
- Enhanced logging for AdGuard Home operations

## [3.2.1] - 2025-11-11

### Fixed
- **Docker Build Fix**: Corrected Dockerfile to use `BUILD_FROM` ARG instead of `BUILD_ARCH` to resolve build failures
- Fixed "InvalidDefaultArgInFrom" warning in Docker build
- Added `--update` flag to apk package installation for better reliability

## [3.2.0] - 2025-11-11

### Added
- **DNS Whitelist Management**: New web interface for managing whitelisted domains
- DNS Whitelist page accessible from dashboard with "DNS Whitelist" button
- API endpoints for DNS whitelist management:
  - `GET /api/whitelist` - Retrieve all whitelisted domains
  - `POST /api/whitelist/add` - Add domain with validation
  - `POST /api/whitelist/remove` - Remove domain by ID
  - `POST /api/whitelist/clear` - Clear all domains
- Default whitelisted domains automatically added on first startup (12 domains including startme.com, bordne.com, icloud.com, apple.com, amazon.com, etc.)
- Persistent storage for DNS whitelist in `/data/dns_whitelist.json`
- Setup script (`setup-whitelist.js`) for automatic whitelist initialization
- Domain format validation and duplicate checking
- Modern responsive UI for whitelist management with real-time feedback

### Changed
- Updated startup script to initialize DNS whitelist on every start
- Enhanced README with DNS whitelist documentation and API endpoints

## [3.0.0] - 2025-08-03

### Fixed
- **BREAKING CHANGE**: Resolved persistent Docker build failures by migrating the add-on from the volatile official Home Assistant base images to the stable and widely used **Home Assistant Community Add-ons base images**. This changes the underlying OS from Debian back to Alpine and simplifies the Dockerfile.

## [2.0.0] - Unreleased

### Changed
- **BREAKING CHANGE**: Attempted migration to official Debian-based images to resolve build errors. This approach was superseded by the move to more stable community images in v3.0.0.

## [1.3.0] - 2025-08-03

### Added
- **Session Persistence**: Onboarded device session data is now saved to a `sessions.json` file in the `/data` directory. This allows sessions to persist across add-on restarts.
- **Real-Time Revocation**: The backend now establishes a persistent WebSocket connection to Home Assistant to listen for a custom `bordneai_revoke_device_event`, allowing for instant, event-based revocation from the Home Assistant UI.
- **Self-Revocation**: The dashboard UI now includes a "Logout" button, allowing users to securely terminate their own session.

## [1.1.0] - 2025-08-03

### Changed
- **BREAKING CHANGE**: Migrated backend authentication with the Home Assistant API from a manually configured Long-Lived Access Token to using the native `SUPERVISOR_TOKEN` provided by the Supervisor. This removes the need for manual credential configuration.

## [1.0.0] - 2025-08-03

### Added
- Initial release of the BordneAI Gateway.
- Secure, QR-code based onboarding flow for headless devices (e.g., Tesla browser).
- Single-Page Application (SPA) UI with three dynamic views: Onboarding, Approval, and a live Dashboard.
- Live dashboard updates via a direct WebSocket connection to the Home Assistant API.
- Backend server built with Node.js and Express.