# BordneAI Gateway Home Assistant Add-on

This add-on provides a secure gateway for onboarding new devices (like a Tesla browser or smart TV) to the BordneAI Dashboard without needing to enter credentials on the device itself.

## Features

- **Secure Onboarding**: Uses a QR code and trusted device (your phone) to approve new dashboard sessions.
- **Native HA Authentication**: Uses the Home Assistant Supervisor for secure, automatic API access. No manual Long-Lived Access Token creation is required.
- **Live Dashboard**: The included single-page app connects directly to your Home Assistant WebSocket API for real-time entity updates.
- **Session Persistence**: Onboarded device sessions are saved to the `/data` directory and survive restarts of the add-on.
- **Real-time Revocation**: A Home Assistant script can fire an event to instantly revoke a device's access.

## Installation

1.  **Copy the Add-on Folder**: Place the entire `bordneai_gateway` directory into the `/addons` directory of your Home Assistant installation.
2.  **Refresh the Add-on Store**: Go to Settings -> Add-ons -> Add-on Store. Click the three dots in the top right and select "Check for updates".
3.  **Install**: The "BordneAI Gateway" add-on will appear under the "Local add-ons" section. Click on it and then click "Install".
4.  **Start**: Start the add-on. Check the logs to ensure the server starts correctly.
5.  **Access the UI**: Use the "Open Web UI" button on the add-on's page. If it's the first time accessing from that browser, it will begin the secure onboarding process.

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