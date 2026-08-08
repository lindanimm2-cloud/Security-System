export const DOCUMENT_CATEGORIES = {
  INCIDENT_EVIDENCE: 'Incident Evidence',
  DISPATCH_REPORT: 'Dispatch Reports',
  CLIENT_RECORD: 'Client Records',
  OFFICER_REPORT: 'Officer Reports',
  POLICY_SOP: 'Policies & SOPs',
  LEGAL_COMPLIANCE: 'Legal & Compliance',
  TRAINING: 'Training',
  VEHICLE_PROPERTY: 'Vehicle & Property',
  OTHER: 'Other',
} as const;

export type DocumentCategoryKey = keyof typeof DOCUMENT_CATEGORIES;

export const CATEGORY_ICONS: Record<DocumentCategoryKey, string> = {
  INCIDENT_EVIDENCE: '📷',
  DISPATCH_REPORT: '📋',
  CLIENT_RECORD: '👤',
  OFFICER_REPORT: '🛡️',
  POLICY_SOP: '📘',
  LEGAL_COMPLIANCE: '⚖️',
  TRAINING: '🎓',
  VEHICLE_PROPERTY: '🚗',
  OTHER: '📄',
};

export function fileTypeIcon(fileType: string) {
  if (fileType.includes('pdf')) return '📕';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('video')) return '🎬';
  if (fileType.includes('audio')) return '🎧';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  return '📄';
}
