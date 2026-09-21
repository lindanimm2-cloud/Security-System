# 4DS Persistent Operational Mode

This document describes **Duty Mode** / **Persistent Operational Mode** for the officer mobile experience.

It is **not** a mechanism that prevents the OS from closing the app.

## Design principles

1. **4DS Cloud is the source of truth.** Duty status, heartbeats, and incident state live on the server. If the phone app is killed, the officer remains ON DUTY in the cloud until they end duty (or Control Room updates status).
2. **Use OS-supported background tools.** Android may use a declared foreground service for an active duty/location session. iOS relies on push notifications and approved background capabilities. The web officer app uses visibility-aware heartbeats + browser notifications as a bridge until native shells ship.
3. **Respect user/OS stop controls.** Android 13+ can stop apps running foreground services. The product must never claim the app “cannot be closed.”
4. **Emergency delivery is push-first.** New SOS / dispatch alerts are fan-out from cloud → Control Room + mobile push → sound/haptic → officer response. The foreground UI is optional for delivery.

## Officer flow

1. Sign in → **Operational Ready** gate (session): connected, notifications, location, device registered.
2. Open **Duty Mode** → run readiness checklist → **Start Duty Mode**.
3. Cloud records `dutyModeActive`, `dutyStartedAt`, device telemetry, and begins accepting heartbeats.
4. Officer may leave the screen / lock the phone. Heartbeats continue while the web session is alive; native builds should use FGS / silent push as appropriate.
5. **End Duty** clears operational mode and sets status `OFF_DUTY`.

## Device Security (Control Room)

While duty is active, Control Room Officers shows:

- Duty active / standby
- Device link: `ONLINE` | `OFFLINE` | `NO_SIGNAL` | `STANDBY`
- Last heartbeat, battery (if available), network, app version

Stale heartbeat threshold: **3 minutes** without a beat while `dutyModeActive` → **OFFICER DEVICE OFFLINE**.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/officer/duty` | Duty + device snapshot |
| POST | `/officer/duty/start` | Start Duty Mode + checks/telemetry |
| POST | `/officer/duty/end` | End Duty Mode |
| POST | `/officer/duty/heartbeat` | Periodic beat while on duty |
| GET | `/officer/dashboard` | Includes duty fields on `officer` |
| GET | `/control-room/officers` | Includes duty/device link for CR |

## Native follow-ups (not faked in web)

- Android: declared FGS for active duty/location with a clear “4DS Operational Mode” notification; handle user-initiated stop.
- iOS: push + background modes only as justified; do not attempt permanent execution.
- Register real push tokens into `officers.push_token` for cloud→device fan-out.

## References

- [Android — Handle user-initiated stopping of FGS apps](https://developer.android.com/develop/background-work/services/fgs/handle-user-stopping)
- [Apple — Extending background execution time](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time)
