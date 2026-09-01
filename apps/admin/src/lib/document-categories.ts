import type { NavIconName } from '@/components/nav/NavIcon';

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

export type DocumentTone =
  | 'incident'
  | 'dispatch'
  | 'client'
  | 'officer'
  | 'policy'
  | 'legal'
  | 'training'
  | 'vehicle'
  | 'neutral';

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

export const CATEGORY_NAV_ICON: Record<DocumentCategoryKey, NavIconName> = {
  INCIDENT_EVIDENCE: 'evidence',
  DISPATCH_REPORT: 'dispatch',
  CLIENT_RECORD: 'customers',
  OFFICER_REPORT: 'officers',
  POLICY_SOP: 'documents',
  LEGAL_COMPLIANCE: 'lock',
  TRAINING: 'report',
  VEHICLE_PROPERTY: 'vehicle',
  OTHER: 'documents',
};

export const CATEGORY_TONE: Record<DocumentCategoryKey, DocumentTone> = {
  INCIDENT_EVIDENCE: 'incident',
  DISPATCH_REPORT: 'dispatch',
  CLIENT_RECORD: 'client',
  OFFICER_REPORT: 'officer',
  POLICY_SOP: 'policy',
  LEGAL_COMPLIANCE: 'legal',
  TRAINING: 'training',
  VEHICLE_PROPERTY: 'vehicle',
  OTHER: 'neutral',
};

export const CATEGORY_BLURB: Record<DocumentCategoryKey, string> = {
  INCIDENT_EVIDENCE: 'Evidence, photos and incident documentation',
  DISPATCH_REPORT: 'Field reports and dispatch notes',
  CLIENT_RECORD: 'Client files, contracts and site records',
  OFFICER_REPORT: 'Duty rosters, handover and officer files',
  POLICY_SOP: 'Controlled policies and standard procedures',
  LEGAL_COMPLIANCE: 'Legal holds, compliance and audit records',
  TRAINING: 'Training packs and competency records',
  VEHICLE_PROPERTY: 'Fleet, keys and property files',
  OTHER: 'Operational files and supporting records',
};

const TONE_NAV_ICON: Record<DocumentTone, NavIconName> = {
  incident: 'evidence',
  dispatch: 'dispatch',
  client: 'customers',
  officer: 'officers',
  policy: 'documents',
  legal: 'lock',
  training: 'report',
  vehicle: 'vehicle',
  neutral: 'documents',
};

export function folderTone(name: string): DocumentTone {
  const n = name.toLowerCase();
  if (n.includes('evidence') || n.includes('incident')) return 'incident';
  if (n.includes('client')) return 'client';
  if (n.includes('officer')) return 'officer';
  if (n.includes('polic') || n.includes('sop')) return 'policy';
  if (n.includes('legal') || n.includes('compliance')) return 'legal';
  if (n.includes('dispatch')) return 'dispatch';
  if (n.includes('train')) return 'training';
  if (n.includes('vehicle') || n.includes('propert') || n.includes('fleet')) return 'vehicle';
  return 'neutral';
}

export function folderNavIcon(name: string): NavIconName {
  return TONE_NAV_ICON[folderTone(name)];
}

export function folderBlurb(name: string, description?: string | null): string {
  if (description?.trim()) return description.trim();
  const tone = folderTone(name);
  const match = (Object.entries(CATEGORY_TONE) as [DocumentCategoryKey, DocumentTone][]).find(
    ([, value]) => value === tone,
  );
  return match ? CATEGORY_BLURB[match[0]] : 'Operational records for this workspace';
}

export function fileExtLabel(fileType: string, fileName?: string): string {
  const fromName = fileName?.split('.').pop()?.toUpperCase();
  if (fromName && fromName.length <= 5 && /^[A-Z0-9]+$/.test(fromName)) return fromName;
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'XLSX';
  if (fileType.includes('word') || fileType.includes('msword')) return 'DOCX';
  if (fileType.includes('png')) return 'PNG';
  if (fileType.includes('jpeg') || fileType.includes('jpg')) return 'JPG';
  if (fileType.includes('image')) return 'IMG';
  if (fileType.includes('mp4') || fileType.includes('video')) return 'MP4';
  if (fileType.includes('audio')) return 'AUDIO';
  if (fileType.includes('text')) return 'TXT';
  return 'FILE';
}

export function fileTypeNavIcon(fileType: string): NavIconName {
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'analytics';
  if (fileType.includes('image')) return 'evidence';
  if (fileType.includes('video')) return 'surveillance';
  if (fileType.includes('pdf') || fileType.includes('word')) return 'documents';
  return 'documents';
}

export function fileTypeIcon(fileType: string) {
  if (fileType.includes('pdf')) return 'PDF';
  if (fileType.includes('image')) return 'IMG';
  if (fileType.includes('video')) return 'VID';
  if (fileType.includes('audio')) return 'AUD';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return 'XLS';
  return 'DOC';
}

export function formatFileSize(kb: number | null | undefined): string {
  if (!kb || kb <= 0) return '';
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(kb >= 10240 ? 0 : 1)} MB`;
}

export function caseRef(incidentId: string, createdAt?: string): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  const short = incidentId.replace(/-/g, '').slice(-4).toUpperCase();
  return `INC-${Number.isNaN(year) ? new Date().getFullYear() : year}-${short}`;
}

export type ClassificationMark = { label: string; tone: 'restricted' | 'evidence' | 'case' | 'ok' | 'muted' };

export function documentClassifications(input: {
  category: string;
  isPinned?: boolean;
  incidentId?: string | null;
  createdAt?: string;
}): ClassificationMark[] {
  const marks: ClassificationMark[] = [];
  const category = input.category as DocumentCategoryKey;
  if (input.incidentId) {
    marks.push({ label: caseRef(input.incidentId, input.createdAt), tone: 'case' });
  }
  if (category === 'INCIDENT_EVIDENCE') {
    marks.push({ label: 'Chain of custody', tone: 'evidence' });
    if (input.incidentId) marks.push({ label: 'Verified', tone: 'ok' });
  }
  if (category === 'OFFICER_REPORT') {
    marks.push({ label: 'Confidential', tone: 'restricted' });
    marks.push({ label: 'Officer records', tone: 'muted' });
  }
  if (category === 'CLIENT_RECORD') {
    marks.push({ label: 'Restricted', tone: 'restricted' });
    marks.push({ label: 'Client', tone: 'muted' });
  }
  if (category === 'LEGAL_COMPLIANCE') {
    marks.push({ label: 'Confidential', tone: 'restricted' });
    marks.push({ label: 'Legal', tone: 'muted' });
  }
  if (category === 'POLICY_SOP') {
    marks.push({ label: 'Controlled', tone: 'muted' });
  }
  if (input.isPinned) marks.push({ label: 'Pinned', tone: 'ok' });
  return marks;
}
