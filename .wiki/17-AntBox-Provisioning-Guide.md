# 17 - AntBox Provisioning Guide

## Objective

Make AntBox provisioning deterministic across hardware replacements.

## Hardware Baseline

- Intel NUC-class device with Quick Sync capable iGPU
- 16 GB RAM minimum
- 500 GB NVMe minimum (local buffer + temporary processing)
- Ethernet preferred over Wi-Fi
- HDHomeRun network tuner(s)

## BIOS Settings (Reference Baseline)

1. Enable Intel VT-x/VT-d.
2. Enable integrated GPU and hardware acceleration features.
3. Disable unnecessary boot devices.
4. Set power restore behavior to "Power On" after outage.
5. Enable watchdog options if available.
6. Set thermal profile to sustained performance mode.

## OS Install Steps

1. Install Ubuntu Server LTS (current stable at deployment time).
2. Create non-root admin user.
3. Apply full updates.
4. Configure static DHCP reservation or static IP.
5. Set timezone and NTP.

## Required Packages

- `ffmpeg`
- `jq`
- `curl`
- `wireguard-tools` (if WireGuard mode enabled)
- `hdhomerun_config` tooling
- `smartmontools`
- `lm-sensors`
- `systemd` service units for daemon

## First-Boot Registration Flow

1. Generate device keypair.
2. Run bootstrap command to enroll with AntServer.
3. Receive signed device certificate or API enrollment token.
4. Persist identity material under locked permissions.
5. Start daemon and verify heartbeat visible in control plane.

## Post-Provision Validation

- tuner discovery successful
- test scan returns channel list
- ingest test stream reaches AntServer
- health endpoint reports expected metrics

## Reprovision Procedure

- Revoke old device identity.
- Reinstall OS from known image.
- Repeat first-boot registration flow.
- Restore non-secret config only.
