# Physical Control Engine

Gate / door / barrier command layer: **Detect → Decide → Alert → Dispatch → Respond → Control → Audit**.

## Lifecycle

```
COMMAND SENT → DEVICE ACKNOWLEDGED → GATE MOVING → OPEN|CLOSED
```

Never assume success from a fire-and-forget command. Adapters (`generic`, `onvif-profile-c`, `hid`, `gallagher`, `demo`) only send; the service owns phase transitions and `SecurityAuditEvent` rows.

## Routes

| Method | Path | Role |
|--------|------|------|
| GET | `/control-room/access-points` | CR |
| POST | `/control-room/access-points/:id/command` | CR |
| GET | `/client/properties/:id/access-points` | Portal |
| POST | `/client/properties/:propertyId/access-points/:id/command` | Portal |

Forced / state-mismatch → `AccessPointState.FORCED` + optional `createFromEmergency` (ALARM).

## Out of scope (this pass)

Real ONVIF Profile A/C/D I/O, ANPR, visitor QR, intercom — adapter contracts only.
