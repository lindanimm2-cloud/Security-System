# IntegrationsModule

Voice SOS + Crash Detection alert layer.

Adapters normalize platform payloads into `VOICE_COMMAND` / `VEHICLE_CRASH_DETECTED`, then
`IncidentCorrelationService` → `IncidentKernelService.createFromEmergency` only.

Never dual-write via panic + kernel. Never claim Crash Detection active without OS entitlement.
