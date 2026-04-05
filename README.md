# BordneAI Home Assistant Add-ons

Home Assistant app repository for BordneAI projects.

This repository publicly contains the BordneAI Home Assistant add-on source and related metadata. Public visibility on GitHub does not change the licensing terms in the root `LICENSE` file.

## Included app

### BordneAI Gateway
Ingress-based Home Assistant app for:

- device onboarding and approval
- session tracking and revocation
- DNS whitelist management
- optional AdGuard Home synchronization

## Installation

### Authorized repository install
1. In Home Assistant, go to **Settings → Add-ons → Add-on Store**.
2. Open the store menu and choose **Repositories**.
3. Add this repository URL:

   `https://github.com/BordneAI/bordneai-ha-addons`

4. Refresh the store.
5. Install **BordneAI Gateway**.

### Authorized local install
1. Copy the `bordneai_gateway` folder into your local Home Assistant `/addons` directory.
2. Refresh local add-ons from the Add-on Store.
3. Install and start **BordneAI Gateway**.

## Repository layout

- `repository.yaml` → Home Assistant repository metadata
- `bordneai_gateway/` → BordneAI Gateway app source, metadata, and web UI

## Support

Maintainer: David Charles Bordne

## License

See the root `LICENSE` file.

Unless a separate written license is granted, this repository remains proprietary. Redistribution, derivative works, and unauthorized deployment are not permitted.