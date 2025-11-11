# BordneAI Gateway Home Assistant Add-on

This add-on provides a secure gateway for onboarding new devices (like a Tesla browser or smart TV) to the BordneAI Dashboard without needing to enter credentials on the device itself.

## Features

- **Secure Onboarding**: Uses a QR code and trusted device (your phone) to approve new dashboard sessions.
- **Native HA Authentication**: Uses the Home Assistant Supervisor for secure, automatic API access. No manual Long-Lived Access Token creation is required.
- **Live Dashboard**: The included single-page app connects directly to your Home Assistant WebSocket API for real-time entity updates.
- **Session Persistence**: Onboarded device sessions are saved to the `/data` directory and survive restarts of the add-on.
- **Real-time Revocation**: A Home Assistant script can fire an event to instantly revoke a device's access.
- **DNS Whitelist Management**: Built-in web interface to manage whitelisted domains for DNS filtering integration.

## Installation

1.  **Copy the Add-on Folder**: Place the entire `bordneai_gateway` directory into the `/addons` directory of your Home Assistant installation.
2.  **Refresh the Add-on Store**: Go to Settings -> Add-ons -> Add-on Store. Click the three dots in the top right and select "Check for updates".
3.  **Install**: The "BordneAI Gateway" add-on will appear under the "Local add-ons" section. Click on it and then click "Install".
4.  **Start**: Start the add-on. Check the logs to ensure the server starts correctly.
5.  **Access the UI**: Use the "Open Web UI" button on the add-on's page. If it's the first time accessing from that browser, it will begin the secure onboarding process.

## DNS Whitelist

The add-on includes a DNS whitelist management interface accessible from the dashboard. Click the **"DNS Whitelist"** button in the header to manage whitelisted domains.

### AdGuard Home Integration

The DNS whitelist automatically syncs with **AdGuard Home** if configured. To enable integration:

1. Go to the add-on **Configuration** tab
2. Set the following options:
   - **adguard_url**: The URL of your AdGuard Home instance
     - If using Home Assistant AdGuard Home addon: `http://a0d7b954-adguard` (or check your addon slug)
     - If using external AdGuard Home: `http://your-ip:3000`
   - **adguard_username**: Your AdGuard Home username (from Settings → General Settings)
   - **adguard_password**: Your AdGuard Home password
3. Save the configuration and restart the add-on
4. Check the addon logs to verify successful connection: `[AdGuard] Successfully synced X domains to AdGuard Home`

Once configured, all whitelist changes will automatically sync to AdGuard Home's custom filtering rules. The addon uses the AdGuard Home API to add allowlist rules in the format `@@||domain.com^$important`.

**Note**: If AdGuard Home is not configured, the whitelist will still work locally but won't affect DNS filtering.

### Default Whitelisted Domains

The following domains are automatically added to the whitelist on first startup:
- startme.com
- bordne.com
- icloud.com
- apple.com
- amazon.com
- chat.avatar.ext.hp.com
- googleapis.com
- tesla.com
- teslamotors.com
- sg.vzwfemto.com
- izatcloud.net
- pool.ntp.org

### Managing the Whitelist

You can add, remove, or clear domains through the web interface. The whitelist is stored in `/data/dns_whitelist.json` and persists across restarts. All changes sync to AdGuard Home in real-time if integration is enabled.

### API Endpoints

The whitelist can also be managed programmatically:
- `GET /api/whitelist` - Get all whitelisted domains
- `POST /api/whitelist/add` - Add a domain (body: `{"domain": "example.com"}`)
- `POST /api/whitelist/remove` - Remove a domain (body: `{"id": "domain-id"}`)
- `POST /api/whitelist/clear` - Clear all domains

All API endpoints will sync to AdGuard Home if configured.

## Revocation Setup (Optional)

To enable the device revocation UI in your Lovelace dashboard:

1.  **Add to `configuration.yaml`**: Add the following code to your `configuration.yaml` file and restart Home Assistant.

    ```yaml
    sensor:
      - platform: rest
        name: "BordneAI Devices"
        resource: http://a0d7b954-bordneai-gateway/api/sessions
        scan_interval: 300
        value_template: "{{ value_json | length }}"
        json_attributes:
          - "devices"

    script:
      bordneai_revoke_device:
        alias: "Revoke BordneAI Device"
        fields:
          token_to_revoke:
            description: "The token of the device session to revoke."
            example: "ey..."
        sequence:
          - event: bordneai_revoke_device_event
            event_data:
              token_to_revoke: "{{ token_to_revoke }}"
    ```

2.  **Add Lovelace Card**: In your dashboard, add a new card and paste the following YAML. This requires the `auto-entities` custom card from HACS.

    ```yaml
    type: custom:auto-entities
    card:
      type: entities
      title: BordneAI Onboarded Devices
    filter:
      template: |
        {% for device in state_attr('sensor.bordneai_devices', 'devices') %}
          {{
            {
              'type': 'custom:button-card',
              'name': device.deviceName | truncate(35),
              'label': 'Onboarded: ' + device.onboardedAt,
              'tap_action': {
                'action': 'call-service',
                'service': 'script.bordneai_revoke_device',
                'service_data': {
                  'token_to_revoke': device.token
                }
              },
              'icon': 'mdi:lan-disconnect'
            }
          }},
        {% endfor %}
    ```