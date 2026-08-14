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

export const DEFAULT_TECH_TESTS = [
  { id: 'power', label: 'Power / battery check' },
  { id: 'signal', label: 'Signal / comms test' },
  { id: 'zones', label: 'Zone walk-test' },
  { id: 'client', label: 'Client walkthrough' },
] as const;

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
  return TECH_WORKFLOW.find((s) => s.id === status)?.label ?? status.replace(/_/g, ' ');
}
