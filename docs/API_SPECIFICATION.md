# API Specification
## 4DS Solutions Mobile Protection Platform

**Base URL:** `https://api.4ds.solutions/v1`  
**WebSocket:** `wss://api.4ds.solutions/realtime`  
**Auth:** Bearer JWT in `Authorization` header  
**Tenant:** Resolved from JWT `tenant_id` claim (admin may use subdomain)  
**Content-Type:** `application/json`  
**Idempotency:** `Idempotency-Key` header on POST for panic/incident creation

---

## Response Envelope

### Success
```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "INCIDENT_NOT_FOUND",
    "message": "Incident not found",
    "details": []
  }
}
```

### Standard HTTP Status Codes
| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No content (delete) |
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden (RBAC) |
| 404 | Not found |
| 409 | Conflict (duplicate idempotency key) |
| 429 | Rate limited |
| 500 | Server error |

---

## 1. Authentication (`/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Register end user |
| POST | `/auth/login` | Public | Email/password login |
| POST | `/auth/officer/login` | Public | Officer login |
| POST | `/auth/admin/login` | Public | Admin/dispatcher login |
| POST | `/auth/refresh` | Refresh token | Rotate access token |
| POST | `/auth/logout` | JWT | Revoke refresh token |
| POST | `/auth/forgot-password` | Public | Send reset email |
| POST | `/auth/reset-password` | Token | Reset password |
| POST | `/auth/verify-email` | Token | Verify email |
| POST | `/auth/verify-phone` | JWT | Send/confirm OTP |
| GET | `/auth/me` | JWT | Current user profile + permissions |

### POST `/auth/register`
```json
// Request
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+27123456789",
  "tenantSlug": "secureco"
}

// Response 201
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "role": "USER" },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

### POST `/auth/login`
```json
// Request
{ "email": "user@example.com", "password": "...", "deviceId": "client-uuid" }
```

---

## 2. Users (`/users`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/users/me` | USER+ | Get own profile |
| PATCH | `/users/me` | USER+ | Update profile |
| DELETE | `/users/me` | USER | Request account deletion |
| POST | `/users/me/avatar` | USER | Upload avatar (multipart) |
| PATCH | `/users/me/tracking` | USER | Enable/disable tracking |
| GET | `/users` | TENANT_ADMIN, DISPATCHER | List users (paginated) |
| GET | `/users/:id` | TENANT_ADMIN, DISPATCHER | Get user detail |
| PATCH | `/users/:id/status` | TENANT_ADMIN | Suspend/activate user |
| GET | `/users/:id/location` | DISPATCHER, FAMILY_MEMBER | Current location |
| GET | `/users/:id/tracking-history` | USER(self), DISPATCHER | Location history |

### Query Parameters (List)
`page`, `limit`, `status`, `search`, `sortBy`, `sortOrder`

---

## 3. Devices (`/devices`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/devices/register` | USER | Register device + FCM token |
| PATCH | `/devices/:id` | USER | Update FCM token |
| DELETE | `/devices/:id` | USER | Unregister device |
| GET | `/devices` | USER | List own devices |

### POST `/devices/register`
```json
{
  "deviceUuid": "stable-client-id",
  "platform": "IOS",
  "fcmToken": "firebase-token",
  "appVersion": "1.0.0",
  "osVersion": "17.0",
  "model": "iPhone 15"
}
```

---

## 4. Emergency Contacts (`/emergency-contacts`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/emergency-contacts` | USER | List contacts |
| POST | `/emergency-contacts` | USER | Add contact |
| PATCH | `/emergency-contacts/:id` | USER | Update contact |
| DELETE | `/emergency-contacts/:id` | USER | Remove contact |
| PUT | `/emergency-contacts/reorder` | USER | Update priority order |

---

## 5. Families (`/families`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/families` | USER | Create family group |
| GET | `/families/me` | USER | Get my family |
| POST | `/families/join` | USER | Join via invite code |
| DELETE | `/families/members/:userId` | USER(owner) | Remove member |
| PATCH | `/families/members/:userId` | USER(owner) | Update permissions |
| GET | `/families/members/locations` | USER, FAMILY_MEMBER | All member locations |
| POST | `/families/invite/regenerate` | USER(owner) | New invite code |

---

## 6. Tracking (`/tracking`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/tracking/batch` | USER | Batch upload locations (offline sync) |
| GET | `/tracking/live` | DISPATCHER | All active user locations (tenant) |
| GET | `/tracking/users/:id/latest` | DISPATCHER, FAMILY | Latest position |

### POST `/tracking/batch`
```json
{
  "locations": [
    {
      "lat": -26.2041,
      "lng": 28.0473,
      "accuracy": 10.5,
      "speed": 0,
      "heading": 180,
      "battery": 85,
      "recordedAt": "2026-06-09T14:30:00Z"
    }
  ]
}
```

**Note:** Real-time tracking primarily via WebSocket; REST batch for offline catch-up.

---

## 7. Incidents (`/incidents`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/incidents/panic` | USER | Trigger panic (idempotent) |
| POST | `/incidents/theft` | USER | Report theft |
| GET | `/incidents` | USER(self), DISPATCHER | List incidents |
| GET | `/incidents/:id` | USER(participant), DISPATCHER | Incident detail |
| PATCH | `/incidents/:id` | DISPATCHER | Update status/priority |
| POST | `/incidents/:id/notes` | DISPATCHER, OFFICER | Add timeline note |
| POST | `/incidents/:id/media` | USER, OFFICER | Upload evidence |
| POST | `/incidents/:id/cancel` | USER, DISPATCHER | Cancel incident |
| POST | `/incidents/:id/resolve` | DISPATCHER, OFFICER | Resolve incident |
| GET | `/incidents/:id/timeline` | USER(participant), DISPATCHER | Full timeline |
| PATCH | `/incidents/:id/theft-recovery` | DISPATCHER | Toggle recovery mode |

### POST `/incidents/panic`
```json
// Headers: Idempotency-Key: <client-incident-uuid>
{
  "clientIncidentId": "uuid-from-mobile",
  "lat": -26.2041,
  "lng": 28.0473,
  "accuracy": 5.0
}

// Response 201 — triggers dispatch workflow automatically
{
  "success": true,
  "data": {
    "incident": {
      "id": "uuid",
      "type": "PANIC",
      "status": "ACTIVE",
      "priority": "CRITICAL"
    }
  }
}
```

### POST `/incidents/theft`
```json
{
  "clientIncidentId": "uuid",
  "lat": -26.2041,
  "lng": 28.0473,
  "description": "Vehicle stolen from parking lot",
  "vehicle": {
    "make": "Toyota",
    "model": "Hilux",
    "color": "White",
    "plate": "CA 123 GP"
  },
  "enableRecoveryMode": true
}
```

---

## 8. Officers (`/officers`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/officers` | DISPATCHER, TENANT_ADMIN | List officers |
| POST | `/officers` | TENANT_ADMIN | Create officer |
| GET | `/officers/:id` | DISPATCHER | Officer detail |
| PATCH | `/officers/:id` | TENANT_ADMIN | Update officer |
| PATCH | `/officers/:id/status` | OFFICER(self), DISPATCHER | Set availability |
| DELETE | `/officers/:id` | TENANT_ADMIN | Deactivate officer |
| GET | `/officers/live` | DISPATCHER | All on-duty officer locations |
| GET | `/officers/:id/performance` | TENANT_ADMIN | Response time stats |

---

## 9. Dispatches (`/dispatches`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/dispatches` | DISPATCHER | List dispatches (filterable) |
| GET | `/dispatches/active` | DISPATCHER, OFFICER | Active dispatches |
| POST | `/dispatches/auto-assign` | DISPATCHER, SYSTEM | Auto-assign nearest officer |
| POST | `/dispatches/manual-assign` | DISPATCHER | Manual officer assignment |
| GET | `/dispatches/:id` | DISPATCHER, OFFICER | Dispatch detail |
| POST | `/dispatches/:id/accept` | OFFICER | Accept assignment |
| POST | `/dispatches/:id/decline` | OFFICER | Decline with reason |
| PATCH | `/dispatches/:id/status` | OFFICER | en_route, on_scene, completed |
| GET | `/dispatches/:id/response-metrics` | DISPATCHER | Response time breakdown |

### POST `/dispatches/auto-assign`
```json
{
  "incidentId": "uuid",
  "maxRadiusKm": 50,
  "fallbackExpand": true
}

// Response
{
  "success": true,
  "data": {
    "dispatch": {
      "id": "uuid",
      "officerId": "uuid",
      "status": "ASSIGNED",
      "distanceAtAssignmentM": 3200,
      "estimatedEtaSec": 480
    }
  }
}
```

---

## 10. Notifications (`/notifications`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | USER, OFFICER | Inbox (paginated) |
| GET | `/notifications/unread-count` | USER, OFFICER | Badge count |
| PATCH | `/notifications/:id/read` | USER, OFFICER | Mark read |
| PATCH | `/notifications/read-all` | USER, OFFICER | Mark all read |
| GET | `/notifications/preferences` | USER | Get preferences |
| PATCH | `/notifications/preferences` | USER | Update preferences |

---

## 11. Messaging (`/conversations`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/conversations` | USER, OFFICER, DISPATCHER | List conversations |
| POST | `/conversations` | USER, DISPATCHER | Start conversation |
| GET | `/conversations/:id` | Participant | Conversation detail |
| GET | `/conversations/:id/messages` | Participant | Message history |
| POST | `/conversations/:id/messages` | Participant | Send message |
| PATCH | `/conversations/:id/read` | Participant | Mark read |

---

## 12. Subscriptions (`/subscriptions`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/subscriptions/plans` | Public | Available plans |
| GET | `/subscriptions/me` | USER | Current subscription |
| POST | `/subscriptions/checkout` | USER | Create Stripe checkout session |
| POST | `/subscriptions/portal` | USER | Stripe customer portal |
| POST | `/subscriptions/cancel` | USER | Cancel subscription |
| GET | `/subscriptions` | TENANT_ADMIN | All tenant subscriptions |
| POST | `/webhooks/stripe` | Stripe sig | Billing webhooks (no JWT) |

---

## 13. Tenants (`/tenants`) — Super Admin / Tenant Admin

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/tenants` | SUPER_ADMIN | List all tenants |
| POST | `/tenants` | SUPER_ADMIN | Create tenant |
| GET | `/tenants/current` | TENANT_ADMIN | Current tenant config |
| PATCH | `/tenants/current` | TENANT_ADMIN | Update branding/settings |
| GET | `/tenants/current/stats` | TENANT_ADMIN | Usage statistics |

---

## 14. Analytics (`/analytics`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/analytics/dashboard` | TENANT_ADMIN, DISPATCHER | Control room KPIs |
| GET | `/analytics/incidents` | TENANT_ADMIN | Incident trends |
| GET | `/analytics/response-times` | TENANT_ADMIN | Avg response by period |
| GET | `/analytics/officers` | TENANT_ADMIN | Officer performance |
| GET | `/analytics/subscriptions` | TENANT_ADMIN | MRR, churn, growth |
| GET | `/analytics/export` | TENANT_ADMIN | CSV export |

### GET `/analytics/dashboard` Response
```json
{
  "success": true,
  "data": {
    "activeUsers": 1247,
    "activeIncidents": 8,
    "availableOfficers": 23,
    "avgResponseTimeSec": 342,
    "incidentsToday": 45,
    "panicIncidentsToday": 3,
    "theftRecoveryActive": 2
  }
}
```

---

## 15. AI Assistant (`/ai`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/ai/conversations` | USER | Start new conversation |
| GET | `/ai/conversations` | USER | List conversations |
| GET | `/ai/conversations/:id` | USER | Conversation with messages |
| POST | `/ai/conversations/:id/messages` | USER | Send message (sync response) |
| POST | `/ai/conversations/:id/messages/stream` | USER | SSE streaming response |
| POST | `/ai/escalate` | USER, SYSTEM | Manual/auto escalation |
| DELETE | `/ai/conversations/:id` | USER | Close conversation |

### POST `/ai/conversations/:id/messages`
```json
// Request
{
  "content": "Someone is following me, what should I do?",
  "context": {
    "includeLocation": true,
    "activeIncidentId": null
  }
}

// Response
{
  "success": true,
  "data": {
    "message": {
      "role": "ASSISTANT",
      "content": "Stay in a well-lit public area..."
    },
    "actions": [],
    "escalationRecommended": false
  }
}
```

### AI Tool Actions (Internal — invoked by OpenAI function calling)
| Tool | Description |
|------|-------------|
| `create_incident` | Create panic/theft incident from conversation |
| `escalate_to_dispatch` | Notify dispatch with CRITICAL priority |
| `notify_emergency_contact` | Alert top emergency contact |
| `get_safety_guidance` | Return contextual safety steps |
| `get_user_location` | Fetch latest GPS for context |

---

## 16. Admin Control Room (`/control-room`)

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/control-room/snapshot` | DISPATCHER | Full dashboard state |
| GET | `/control-room/map/users` | DISPATCHER | GeoJSON of active users |
| GET | `/control-room/map/officers` | DISPATCHER | GeoJSON of officers |
| GET | `/control-room/incidents/active` | DISPATCHER | Active incidents with coords |
| GET | `/control-room/theft-recovery` | DISPATCHER | Recovery mode incidents |

---

## 17. Health & System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | Liveness |
| GET | `/ready` | Public | Readiness (DB, Redis) |

---

## WebSocket API

**Connect:** `wss://api.4ds.solutions/realtime?token=<JWT>`

### Connection Handshake
Client sends after connect:
```json
{ "event": "authenticate", "data": { "token": "jwt" } }
```

Server responds:
```json
{ "event": "authenticated", "data": { "userId": "uuid", "rooms": ["tenant:uuid"] } }
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `location:update` | `{ lat, lng, accuracy?, speed?, heading?, battery? }` | GPS update |
| `panic:trigger` | `{ clientIncidentId, lat, lng }` | Emergency panic |
| `officer:location` | `{ lat, lng, ... }` | Officer position |
| `incident:subscribe` | `{ incidentId }` | Join incident room |
| `incident:unsubscribe` | `{ incidentId }` | Leave incident room |
| `dispatch:accept` | `{ dispatchId }` | Officer accepts |
| `dispatch:status` | `{ dispatchId, status }` | Status update |
| `message:send` | `{ conversationId, content, type? }` | Chat message |
| `typing:start` | `{ conversationId }` | Typing indicator |
| `typing:stop` | `{ conversationId }` | Stop typing |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `location:updated` | `{ userId, lat, lng, recordedAt }` | User moved |
| `officer:location` | `{ officerId, lat, lng, status }` | Officer moved |
| `incident:created` | `{ incident }` | New incident |
| `incident:updated` | `{ incident, changes }` | Status change |
| `dispatch:assigned` | `{ dispatch, officer, incident }` | New assignment |
| `dispatch:updated` | `{ dispatch }` | Status change |
| `notification:new` | `{ notification }` | Push/in-app |
| `family:location` | `{ userId, lat, lng }` | Family member moved |
| `message:received` | `{ message }` | New chat message |
| `theft:recovery:update` | `{ incidentId, lat, lng }` | Recovery tracking |
| `ai:response` | `{ conversationId, message }` | Streaming AI chunk |

### Room Structure
```
tenant:{tenantId}           — all dispatchers
user:{userId}               — personal notifications
incident:{incidentId}       — incident participants
officer:{officerId}         — officer-specific
family:{familyId}           — family location sharing
```

---

## Rate Limits

| Endpoint Group | Limit |
|----------------|-------|
| Auth | 10 req/min per IP |
| Panic/Incident create | 5 req/min per user |
| Tracking batch | 60 req/min per user |
| AI messages | 20 req/min per user |
| General API | 100 req/min per user |
| WebSocket location | 1 update/sec per connection (server throttles) |

---

## Pagination

All list endpoints support:
```
?page=1&limit=20&sortBy=createdAt&sortOrder=desc
```

Default `limit`: 20, max: 100.

---

## Versioning

- URL prefix: `/v1`
- Breaking changes → `/v2` with 6-month deprecation window
- `Sunset` header on deprecated endpoints
