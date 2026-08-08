export type DispatchQuickMessage = {
  label: string;
  text: string;
};

export const DISPATCH_QUICK_MESSAGES: DispatchQuickMessage[] = [
  { label: 'Alarm fault', text: 'Alarm fault — system showing a fault. Please investigate.' },
  { label: 'False alarm', text: 'False alarm — no assistance required. All clear on site.' },
  { label: 'Suspicious activity', text: 'Suspicious activity reported at my location. Please advise.' },
  { label: 'Request patrol', text: 'Requesting a patrol check at my property.' },
  { label: 'Gate / access issue', text: 'Gate or access control issue — unable to enter/exit securely.' },
  { label: 'Power outage', text: 'Power outage affecting my alarm/security system.' },
  { label: 'Vehicle assistance', text: 'Vehicle assistance required — please dispatch support.' },
  { label: 'Wellness check', text: 'Requesting a wellness check at my location.' },
  { label: 'Escort request', text: 'Requesting a security escort for high-risk travel.' },
  { label: 'All clear', text: 'All clear — situation resolved. No further assistance needed.' },
];
