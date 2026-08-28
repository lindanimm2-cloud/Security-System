/** Demo dispatch recommendation engine — zone, skills, availability. */

export type DispatchOfficerInput = {
  id: string;
  name: string;
  status: string;
  zone: string;
  avgResponseSec?: number;
  callSign?: string | null;
  skills?: string[];
};

export type DispatchContext = {
  incidentType: string;
  priority: string;
  location?: string;
  zone?: string;
};

export type DispatchCandidate = {
  officerId: string;
  name: string;
  callSign?: string | null;
  zone: string;
  status: string;
  score: number;
  reasons: string[];
  etaMin?: number;
};

const TYPE_SKILLS: Record<string, string[]> = {
  PANIC: ['armed', 'first-aid'],
  MEDICAL: ['medical', 'first-aid'],
  FIRE: ['fire', 'medical'],
  INTRUSION: ['armed'],
  ALARM: ['armed'],
  THEFT: ['armed'],
};

function statusScore(status: string): number {
  const s = (status ?? '').toUpperCase();
  if (s === 'AVAILABLE') return 40;
  if (s === 'ON_PATROL') return 25;
  if (s === 'EN_ROUTE') return 5;
  if (s === 'BUSY') return 0;
  return 10;
}

function zoneScore(officerZone: string, contextZone?: string): number {
  if (!contextZone) return 5;
  const oz = officerZone.toLowerCase();
  const cz = contextZone.toLowerCase();
  if (oz === cz) return 30;
  if (oz.includes(cz.split(' ')[0]) || cz.includes(oz.split(' ')[0])) return 15;
  return 0;
}

function skillScore(officerSkills: string[] | undefined, needed: string[]): number {
  if (!needed.length) return 5;
  const have = new Set((officerSkills ?? []).map((s) => s.toLowerCase()));
  const match = needed.filter((n) => have.has(n.toLowerCase())).length;
  return match * 12;
}

function responseScore(avgSec?: number): number {
  if (!avgSec) return 5;
  if (avgSec <= 200) return 15;
  if (avgSec <= 280) return 10;
  return 5;
}

function priorityBoost(priority: string): number {
  const p = (priority ?? '').toUpperCase();
  if (p === 'CRITICAL') return 8;
  if (p === 'HIGH') return 4;
  return 0;
}

/** Rank officers for dispatch — highest score first. */
export function rankOfficersForDispatch(
  officers: DispatchOfficerInput[],
  context: DispatchContext,
  limit = 3,
): DispatchCandidate[] {
  const type = (context.incidentType ?? '').toUpperCase();
  const neededSkills = TYPE_SKILLS[type] ?? ['armed'];
  const ctxZone = context.zone ?? guessZone(context.location);

  const ranked = officers
    .map((o) => {
      const reasons: string[] = [];
      let score = 0;

      const ss = statusScore(o.status);
      score += ss;
      if (ss >= 40) reasons.push('Available now');
      else if (ss >= 25) reasons.push('On patrol nearby');

      const zs = zoneScore(o.zone, ctxZone);
      score += zs;
      if (zs >= 30) reasons.push(`Same zone (${o.zone})`);
      else if (zs >= 15) reasons.push('Adjacent zone');

      const sk = skillScore(o.skills, neededSkills);
      score += sk;
      if (sk >= 12) reasons.push('Skill match');

      const rs = responseScore(o.avgResponseSec);
      score += rs;
      if (rs >= 15) reasons.push('Fast avg response');

      score += priorityBoost(context.priority);

      const etaMin =
        o.status.toUpperCase() === 'AVAILABLE'
          ? Math.max(3, Math.round((o.avgResponseSec ?? 240) / 60))
          : undefined;

      return {
        officerId: o.id,
        name: o.name,
        callSign: o.callSign ?? null,
        zone: o.zone,
        status: o.status,
        score,
        reasons: reasons.length ? reasons : ['Eligible unit'],
        etaMin,
      };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}

function guessZone(location?: string): string | undefined {
  if (!location) return undefined;
  const loc = location.toLowerCase();
  if (loc.includes('umhlanga') || loc.includes('gateway')) return 'Zone A';
  if (loc.includes('glenwood') || loc.includes('hillcrest')) return 'Zone B';
  if (loc.includes('prospecton') || loc.includes('ridge')) return 'Zone C';
  return undefined;
}
