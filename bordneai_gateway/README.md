# BordneAI Gateway Home Assistant Add-on

This add-on provides a secure gateway for onboarding new devices (like a Tesla browser or smart TV) to the BordneAI Dashboard without needing to enter credentials on the device itself.

## Features

- **Secure Onboarding**: Uses a QR code and trusted device (your phone) to approve new dashboard sessions.
- **Native HA Authentication**: Uses the Home Assistant Supervisor for secure, automatic API access. **No manual Long-Lived Access Token creation is required.**
- **Live Dashboard**: The included single-page app connects directly to your Home Assistant WebSocket API for real-time entity updates.
- **Session Persistence**: Onboarded device sessions are saved and will survive restarts of the add-on.

## Installation

1.  **Copy the Add-on Folder**: Place the entire `bordneai_gateway` directory into the `/addons` directory of your Home Assistant installation.
2.  **Refresh the Add-on Store**: Go to Settings -> Add-ons -> Add-on Store. Click the three dots in the top right and select "Check for updates".
3.  **Install**: The "BordneAI Gateway" add-on will appear under the "Local add-ons" section. Click on it and then click "Install".
4.  **Start**: Start the add-on. Check the logs to ensure the server starts correctly.
5.  **Access the UI**: Use the "Open Web UI" button on the add-on's page. If it's the first time accessing from that browser, it will begin the secure onboarding process.

## Configuration

This add-on requires **no manual configuration** in the `Configuration` tab. It seamlessly integrates with Home Assistant's internal authentication system.