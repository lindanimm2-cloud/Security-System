import {
  MEDICAL_PROFILE_CONSENT_NOTICE,
  NATIVE_SOS_DISCLAIMER,
} from '@/lib/device-security';

/** Public URL of the legal instrument. Must stay outside any auth-gated route group. */
export const PUBLIC_LEGAL_PATH = '/legal';

export const LEGAL_DOC_ID = 'PP-EMERG-01';

export const LEGAL_CONTACT = {
  company: '4DS Nexus',
  email: 'hello@4dsnexus.co.za',
  phone: '+27 11 100 4400',
};

export const SERVICE_TERMS_CLAUSES = [
  'Protection, response and monitoring services are provided only to the extent contracted in your service agreement and subscription plan.',
  'Response times, coverage areas and unit availability are operational targets, not guarantees, and depend on location, traffic, access and demand.',
  'This application and its alerting features do not replace public emergency services (10111, 112 or 10177).',
  'You are responsible for the accuracy of the details you supply — contact numbers, site address, access codes, vehicle registrations and family members.',
  'You are responsible for keeping your account credentials, device access and registered devices secure, and for reporting loss or compromise immediately.',
  'Test alerts must be marked as tests. Repeated false or abusive alarms may be charged for or handled under the service agreement.',
  'Subscription fees, billing cycle, upgrades and cancellation are governed by the plan you select at registration and your service agreement.',
  'Equipment and installation purchases are subject to the store terms shown at checkout, including licence verification where the item requires it.',
];

export const NATIVE_SOS_CLAUSES = [
  'Native Emergency SOS is controlled by the operating system and device manufacturer.',
  'Functionality varies by device, OS version and region.',
  'The application does not replace emergency services.',
  'Native Emergency SOS may operate independently of this application.',
  'The application cannot guarantee reception of native SOS events.',
  'Network availability affects emergency communications.',
  'Location may be unavailable or inaccurate.',
  'You must maintain appropriate permissions and keep the app updated.',
  'Test alerts are not real emergencies.',
  'False or abusive alarms may be handled according to the service agreement.',
  'Security response is subject to contracted services and operational availability.',
];

export const EMERGENCY_DATA_CLAUSES = [
  'Device information and internal device identifiers (not IMEI as a primary ID)',
  'Authentication information and security logs',
  'Emergency events and control-room actions',
  'Location data where permission exists',
  'Emergency contacts',
  'Medical information where voluntarily supplied',
  'Medical scheme (medical aid) name, plan/option and membership number where supplied',
  'Property / site details and access codes where supplied for home response',
  'Vehicle registration and description where supplied for tracking & recovery',
  'Family member invite details (name, email, relationship) where supplied',
  'Safe-zone names and approximate locations where supplied',
];

export const MEDICAL_CLAUSES = [
  'Medical profile fields (blood type, allergies, medications, chronic conditions, emergency notes, doctor contact, ambulance preference) are special personal information under POPIA.',
  'Medical aid / medical scheme name, plan or option, and membership number are collected only to help authorised medical responders obtain treatment or authorisation during an emergency.',
  'Ordinary security officers and control-room staff see that a medical emergency was requested — they do not see full medical or scheme membership details unless they are an authorised medical desk user.',
  'You may leave medical aid fields blank (“Prefer not to say”) or remove them at any time from Medical profile.',
  'Scheme membership details are not sold, used for marketing, or shared with medical schemes for non-emergency purposes by this application.',
  'Access to medical and medical-aid data is logged and retained according to company policy and applicable South African law.',
];

export const PRIVACY_CLAUSES = [
  'Personal information is processed under the Protection of Personal Information Act (POPIA) for the purpose of delivering contracted protection, response and supply services.',
  'Information is shared internally only with the control room, dispatched response units, assigned technicians and — for medical events — the authorised medical desk.',
  'Third-party processors are limited to payment, messaging and hosting providers used to operate the service.',
  'Personal information is never sold, and marketing use requires separate opt-in.',
  'Location is processed only while permission is granted on your device, and is used for response, tracking and safe-zone features you enable.',
  'You may request access to, correction of, or deletion of your information, and may withdraw a consent at any time, subject to records we must keep by law or for incident evidence.',
  'Withdrawing consent for location, medical or family features may reduce or disable the protection those features provide.',
  'Retention follows company policy and applicable law; security and incident logs are retained for audit and evidentiary purposes.',
  `Privacy queries and POPIA requests: ${LEGAL_CONTACT.email} · ${LEGAL_CONTACT.phone}.`,
];

export type LegalSection = {
  id: string;
  number: string;
  title: string;
  intro?: string;
  clauses: string[];
  note?: string;
};

/** Ordered sections rendered on the public page and in the registration popup. */
export const LEGAL_SECTIONS: LegalSection[] = [
  {
    id: 'terms',
    number: '01',
    title: 'Service terms',
    intro:
      'These terms govern the protection service, the control-room response attached to it, and the use of this application.',
    clauses: SERVICE_TERMS_CLAUSES,
  },
  {
    id: 'sos',
    number: '02',
    title: 'Limitations of native SOS',
    intro: NATIVE_SOS_DISCLAIMER,
    clauses: NATIVE_SOS_CLAUSES,
  },
  {
    id: 'data',
    number: '03',
    title: 'Emergency & security data',
    intro:
      'Where permitted and necessary for contracted response, the security company may process:',
    clauses: EMERGENCY_DATA_CLAUSES,
    note: 'Medical and emergency data are under stricter access controls. Ordinary security employees cannot view medical information unless authorised. Access is audited. Retention follows company policy and applicable law (including POPIA).',
  },
  {
    id: 'medical',
    number: '04',
    title: 'Medical profile & medical aid',
    intro:
      'If you voluntarily provide a medical profile — including South African medical scheme (medical aid) type, plan and membership number — you authorise use of that information for emergency response only.',
    clauses: MEDICAL_CLAUSES,
    note: MEDICAL_PROFILE_CONSENT_NOTICE,
  },
  {
    id: 'privacy',
    number: '05',
    title: 'Privacy notice',
    intro:
      'This notice explains how personal information is processed, who may see it, and how to exercise your rights.',
    clauses: PRIVACY_CLAUSES,
  },
];
