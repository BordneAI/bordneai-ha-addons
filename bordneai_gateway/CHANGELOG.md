# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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