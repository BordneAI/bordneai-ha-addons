# BordneAI Gateway

BordneAI Gateway is a Home Assistant app that provides an ingress-based web UI for device onboarding, session management, and DNS whitelist administration.

## What it does

- onboarding flow for new dashboard devices
- approval flow through a trusted Home Assistant session
- session tracking and revocation
- DNS whitelist management
- optional AdGuard Home sync for allowlist rules

## Access model

BordneAI Gateway is intended to be used through **Home Assistant ingress** and the **Open Web UI** button.

Recommended hardened behavior:

- no host port is published for direct external access
- management actions are restricted to approved admin identities
- onboarding approval is completed server-side
- raw Home Assistant long-lived tokens are not returned to onboarding clients
- session data persists in `/data`

## Installation

### Repository install
1. Add the BordneAI add-on repository to Home Assistant.
2. Refresh the Add-on Store.
3. Install **BordneAI Gateway**.
4. Start the app.
5. Open the UI from the add-on page.

### Local install
1. Copy `bordneai_gateway` into your Home Assistant `/addons` directory.
2. Refresh local add-ons.
3. Install and start **BordneAI Gateway**.
4. Open the UI from the add-on page.

## Configuration

### Required platform behavior
- `ingress: true`
- `ingress_port: 1111`
- `homeassistant_api: true`

### App options
- `adguard_url`  
  Optional AdGuard Home base URL.

- `adguard_username`  
  Optional AdGuard Home username.

- `adguard_password`  
  Optional AdGuard Home password.

- `admin_users`  
  Comma-separated Home Assistant usernames or user IDs allowed to approve devices, revoke sessions, and manage the whitelist.

## DNS whitelist

The app maintains a DNS whitelist in `/data/dns_whitelist.json`.

Supported actions:
- view whitelist entries
- add a domain
- remove a domain
- clear all domains

If AdGuard Home is configured, whitelist changes are synced to AdGuard Home custom filtering rules.

## Session management

The app stores approved session metadata in `/data/sessions.json`.

Recommended hardened behavior:
- pending sessions expire automatically
- management views do not expose raw Home Assistant tokens
- revocation targets session records rather than token disclosure in the UI

## AdGuard Home notes

If AdGuard Home is configured, BordneAI Gateway syncs allowlist rules using the AdGuard Home API.

Typical local add-on URL format:
- `http://a0d7b954-adguard`

Example external URL format:
- `http://your-ip:3000`

## Troubleshooting

### UI does not load
- confirm the app starts successfully
- confirm ingress is enabled
- confirm `ingress_port` matches the application listen port

### Management actions are denied
- confirm `admin_users` is configured
- confirm your Home Assistant user matches one of the configured values

### AdGuard sync fails
- confirm the URL, username, and password are correct
- check add-on logs for AdGuard API errors

## License

See the root repository `LICENSE`.