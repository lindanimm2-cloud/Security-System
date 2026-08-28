import {
  criticalLensQueue,
  lensBadge,
  typeMixSummary,
  incidentNeedsLensAttention,
  panicSourceLabel,
  DEFAULT_LENS_SETTINGS,
  effectiveLensSettings,
} from './eye-lens';
import type { OpsIncident } from './ops-incident';

function inc(partial: Partial<OpsIncident> & Pick<OpsIncident, 'id' | 'type' | 'user'>): OpsIncident {
  return {
    location: 'Test',
    time: '1 min ago',
    priority: 'HIGH',
    status: 'OPEN',
    ...partial,
  };
}

const settings = DEFAULT_LENS_SETTINGS;

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const panic = inc({
  id: 'p1',
  type: 'PANIC',
  user: 'Nomsa Client',
  priority: 'CRITICAL',
  location: 'Umhlanga Rocks Dr',
  source: 'APP PANIC',
});
const intrusion = inc({
  id: 'i1',
  type: 'INTRUSION',
  user: 'James Demo',
  slaBreached: true,
});
const theft = inc({ id: 't1', type: 'THEFT', user: 'Nomsa Client' });
const alarm = inc({ id: 'a1', type: 'ALARM', user: 'Sarah Client', priority: 'MEDIUM' });
const resolved = inc({ id: 'r1', type: 'PANIC', user: 'Old', status: 'RESOLVED', priority: 'CRITICAL' });

const queue = criticalLensQueue([panic, intrusion, theft, alarm, resolved], settings);
assert(queue.length === 3, `expected 3 critical items, got ${queue.length}`);
assert(queue[0].type === 'PANIC', 'panic should rank first');
assert(typeMixSummary(queue) === '1 Panic · 1 Intrusion · 1 Theft', `mix was ${typeMixSummary(queue)}`);

const badge = lensBadge(queue);
assert(badge.panic === true, 'badge should be panic mode');
assert(badge.count === 1, `panic badge should be 1, got ${badge.count}`);

assert(panicSourceLabel(panic) === 'APP PANIC', 'app panic source');
assert(panicSourceLabel({ ...panic, isSilent: true, source: 'DURESS' }) === 'DURESS', 'duress');
assert(panicSourceLabel({ ...panic, source: 'NATIVE SOS' }) === 'NATIVE SOS', 'native only when explicit');
assert(
  !incidentNeedsLensAttention(resolved, settings),
  'resolved panic must not count',
);
assert(
  !incidentNeedsLensAttention(alarm, settings),
  'routine P2 alarm must not count without SLA',
);

const policy = effectiveLensSettings({ ...settings, showPanic: false, showP1: false });
assert(policy.showPanic === true && policy.showP1 === true, 'policy must force panic/P1');

console.log('eye-lens logic ok');
