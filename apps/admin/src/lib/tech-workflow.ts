export const TECH_WORKFLOW = [
  { id: 'SCHEDULED', label: 'Accept' },
  { id: 'EN_ROUTE', label: 'En route' },
  { id: 'ARRIVED', label: 'Arrived' },
  { id: 'SITE_CHECK', label: 'Site check' },
  { id: 'INSTALL', label: 'Install' },
  { id: 'TESTING', label: 'Testing' },
  { id: 'CLIENT_APPROVAL', label: 'Client approval' },
  { id: 'COMPLETED', label: 'Complete' },
] as const;

export type TechWorkflowId = (typeof TECH_WORKFLOW)[number]['id'];

export const INSTALL_CHECKLIST = [
  { id: 'equipment', label: 'Confirm equipment' },
  { id: 'access', label: 'Confirm site access' },
  { id: 'mount', label: 'Mount cameras' },
  { id: 'nvr', label: 'Connect NVR' },
  { id: 'network', label: 'Configure network' },
  { id: 'cameras', label: 'Configure cameras' },
  { id: 'recording', label: 'Test recording' },
  { id: 'remote', label: 'Test remote access' },
  { id: 'demo', label: 'Client demonstration' },
  { id: 'signoff', label: 'Client sign-off' },
] as const;

/** Kept for existing job payloads that still use the shorter test set. */
export const DEFAULT_TECH_TESTS = INSTALL_CHECKLIST;

export type ChecklistItem = { id: string; label: string; done: boolean };

export function mergeChecklist(jobTests?: ChecklistItem[] | null): ChecklistItem[] {
  const byId = new Map((jobTests ?? []).map((t) => [t.id, t]));
  const merged: ChecklistItem[] = INSTALL_CHECKLIST.map((item) => {
    const existing = byId.get(item.id);
    return { id: item.id, label: existing?.label ?? item.label, done: Boolean(existing?.done) };
  });
  for (const extra of jobTests ?? []) {
    if (!INSTALL_CHECKLIST.some((item) => item.id === extra.id)) {
      merged.push({ id: extra.id, label: extra.label, done: extra.done });
    }
  }
  return merged;
}

export function workflowIndex(status: string) {
  const idx = TECH_WORKFLOW.findIndex((s) => s.id === status);
  if (idx >= 0) return idx;
  if (status === 'IN_PROGRESS') return TECH_WORKFLOW.findIndex((s) => s.id === 'INSTALL');
  return 0;
}

export function nextWorkflowStatus(status: string): TechWorkflowId | null {
  const idx = workflowIndex(status);
  const next = TECH_WORKFLOW[idx + 1];
  return next?.id ?? null;
}

export function workflowLabel(status: string) {
  if (status === 'IN_PROGRESS') return 'Install';
  return TECH_WORKFLOW.find((s) => s.id === status)?.label ?? status.replace(/_/g, ' ');
}

export type JobPrimaryAction = {
  label: string;
  kind: 'advance' | 'navigate' | 'checklist' | 'done';
};

export function workflowStageKey(status: string) {
  const id = status === 'IN_PROGRESS' ? 'INSTALL' : status;
  return id.toLowerCase().replace(/_/g, '-');
}

export function primaryActionFor(status: string): JobPrimaryAction {
  switch (status) {
    case 'SCHEDULED':
      return { label: 'Accept job', kind: 'advance' };
    case 'EN_ROUTE':
      return { label: 'Checklist', kind: 'checklist' };
    case 'ARRIVED':
      return { label: 'Start site check', kind: 'advance' };
    case 'SITE_CHECK':
      return { label: 'Start installation', kind: 'advance' };
    case 'INSTALL':
    case 'IN_PROGRESS':
      return { label: 'Continue installation', kind: 'advance' };
    case 'TESTING':
      return { label: 'Start testing', kind: 'advance' };
    case 'CLIENT_APPROVAL':
      return { label: 'Request signature', kind: 'advance' };
    case 'COMPLETED':
      return { label: 'Job complete', kind: 'done' };
    default:
      return { label: `Mark ${workflowLabel(nextWorkflowStatus(status) ?? status)}`, kind: 'advance' };
  }
}

export function stageActionLabel(status: string) {
  if (status === 'EN_ROUTE') return 'Confirm arrival';
  if (status === 'CLIENT_APPROVAL') return 'Request signature';
  const action = primaryActionFor(status);
  if (action.kind === 'done' || action.kind === 'checklist') {
    const next = nextWorkflowStatus(status);
    return next ? `Mark ${workflowLabel(next)}` : null;
  }
  return action.label;
}

export function advanceActionLabel(status: string) {
  return stageActionLabel(status);
}

export function mapsUrl(address: string) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

export function optionTone(done: number, total: number): 'idle' | 'hot' | 'ok' {
  if (total > 0 && done >= total) return 'ok';
  if (done > 0) return 'hot';
  return 'idle';
}

export function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits}`;
}

export type EquipmentItem = {
  id: string;
  name: string;
  model: string;
  serial: string;
  status: 'installed' | 'pending' | 'defective';
};

export function equipmentFromJob(job: {
  id: string;
  jobType?: string;
  equipmentNotes?: string | null;
  serial?: string;
  equipment?: EquipmentItem[];
}): EquipmentItem[] {
  if (job.equipment?.length) return job.equipment;
  const notes = job.equipmentNotes ?? '';
  const turretMatch = notes.match(/(\d+)\s*[x×]\s*/i);
  const camCount = turretMatch ? Math.min(6, Math.max(1, Number(turretMatch[1]))) : job.jobType === 'CCTV' ? 4 : 1;
  const items: EquipmentItem[] = [];
  if (/nvr/i.test(notes) || job.jobType === 'CCTV') {
    items.push({
      id: `${job.id}-nvr`,
      name: 'NVR',
      model: 'Network video recorder',
      serial: '',
      status: 'pending',
    });
  }
  for (let i = 1; i <= camCount; i += 1) {
    items.push({
      id: `${job.id}-cam-${i}`,
      name: `Camera ${String(i).padStart(2, '0')}`,
      model: job.jobType === 'ALARM' ? 'Alarm sensor' : 'Hikvision turret camera',
      serial: i === 1 ? job.serial ?? '' : '',
      status: i === 1 && job.serial ? 'installed' : 'pending',
    });
  }
  if (job.jobType === 'ACCESS') {
    return [
      {
        id: `${job.id}-reader`,
        name: 'Reader 01',
        model: 'Access control reader',
        serial: job.serial ?? '',
        status: job.serial ? 'installed' : 'pending',
      },
      {
        id: `${job.id}-panel`,
        name: 'Controller',
        model: 'Door controller',
        serial: '',
        status: 'pending',
      },
    ];
  }
  if (job.jobType === 'ALARM') {
    return [
      {
        id: `${job.id}-panel`,
        name: 'Alarm panel',
        model: notes || 'Alarm control panel',
        serial: job.serial ?? '',
        status: job.serial ? 'installed' : 'pending',
      },
    ];
  }
  return items;
}
