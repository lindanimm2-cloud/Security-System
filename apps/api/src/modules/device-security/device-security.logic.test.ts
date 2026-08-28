import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAuthenticateFromDevice,
  detectNativeSosFromUserAgent,
  emergencyReadinessScore,
  generateDevicePublicId,
  hashToken,
  hitRateLimit,
  isEmergencySessionExpired,
  nextPanicWorkflow,
  parseUserAgent,
  shouldReusePanic,
} from './device-security.logic';

test('generates internal device ids without IMEI', () => {
  const id = generateDevicePublicId(() => Buffer.from('aabbccddeeff', 'hex'));
  assert.equal(id, 'SEC-DEVICE-AABBCCDDEEFF');
  assert.doesNotMatch(id, /imei/i);
});

test('parses common user agents', () => {
  const android = parseUserAgent(
    'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36',
  );
  assert.equal(android.osName, 'Android');
  assert.equal(android.osVersion, '15');
  assert.equal(android.name, 'Samsung Galaxy S24 Ultra');

  const ios = parseUserAgent(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
  );
  assert.equal(ios.osName, 'iOS');
  assert.equal(ios.name, 'iPhone');

  const desktop = parseUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
  );
  assert.equal(desktop.deviceType, 'desktop');
  assert.match(desktop.name, /Chrome \/ Windows/);
});

test('does not claim native SOS on web user agents', () => {
  const sos = detectNativeSosFromUserAgent(
    'Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 Chrome/126.0.0.0 Mobile Safari/537.36',
  );
  assert.equal(sos.status, 'NOT_AVAILABLE');
  assert.match(sos.note, /independently/i);
});

test('device auth is blocked for lost/stolen/revoked/locked', () => {
  assert.equal(canAuthenticateFromDevice('TRUSTED', false, false), true);
  assert.equal(canAuthenticateFromDevice('LOST', false, false), false);
  assert.equal(canAuthenticateFromDevice('STOLEN', false, false), false);
  assert.equal(canAuthenticateFromDevice('TRUSTED', true, false), false);
  assert.equal(canAuthenticateFromDevice('TEMPORARY', false, true), false);
  assert.equal(canAuthenticateFromDevice('TRUSTED', false, true), true);
});

test('emergency sessions expire', () => {
  assert.equal(isEmergencySessionExpired(new Date(Date.now() - 1000)), true);
  assert.equal(isEmergencySessionExpired(new Date(Date.now() + 60_000)), false);
});

test('duplicate panic is reused while active', () => {
  assert.equal(shouldReusePanic({ workflowStatus: 'NEW', isTest: false }), true);
  assert.equal(shouldReusePanic({ workflowStatus: 'RESOLVED', isTest: false }), false);
  assert.equal(shouldReusePanic({ workflowStatus: 'NEW', isTest: true }), false);
});

test('panic workflow transitions are constrained', () => {
  assert.equal(nextPanicWorkflow('NEW', 'ACKNOWLEDGED'), true);
  assert.equal(nextPanicWorkflow('NEW', 'RESOLVED'), false);
  assert.equal(nextPanicWorkflow('RESOLVED', 'ACKNOWLEDGED'), false);
  assert.equal(nextPanicWorkflow('ACKNOWLEDGED', 'DISPATCHED'), true);
});

test('readiness score ignores unavailable native SOS as a hard failure', () => {
  const ready = emergencyReadinessScore({
    hasPrimary: true,
    locationConfigured: true,
    notificationsConfigured: true,
    nativeSosAvailable: false,
    contactsConfigured: true,
    panicTested: true,
    consentRecorded: true,
  });
  assert.equal(ready.score, 100);
  assert.equal(ready.items.find((i) => i.id === 'native-sos')?.warn, true);
});

test('rate limiter allows emergencies after window and blocks bursts', () => {
  const buckets = new Map();
  assert.equal(hitRateLimit(buckets, 'login', 2, 1000, 0), true);
  assert.equal(hitRateLimit(buckets, 'login', 2, 1000, 1), true);
  assert.equal(hitRateLimit(buckets, 'login', 2, 1000, 2), false);
  assert.equal(hitRateLimit(buckets, 'login', 2, 1000, 1001), true);
});

test('token hashing is deterministic', () => {
  assert.equal(hashToken('abc'), hashToken('abc'));
  assert.notEqual(hashToken('abc'), hashToken('abd'));
});
