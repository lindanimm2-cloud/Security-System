export const SERVICE_REQUEST_KINDS = [
  'check-in',
  'journey',
  'escort',
  'wellness',
  'roadside',
  'share-location',
] as const;

export type ServiceRequestKind = (typeof SERVICE_REQUEST_KINDS)[number];

export type ServiceField = {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'datetime-local' | 'number' | 'select' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  hint?: string;
  min?: number;
  options?: { value: string; label: string }[];
  showIf?: { field: string; equals?: string | boolean; oneOf?: Array<string | boolean> };
};

export type ServiceRequestDef = {
  kind: ServiceRequestKind;
  title: string;
  summary: string;
  submitLabel: string;
  fields: ServiceField[];
};

export const SERVICE_REQUESTS: Record<ServiceRequestKind, ServiceRequestDef> = {
  'check-in': {
    kind: 'check-in',
    title: 'Check-in timer',
    summary: 'Schedule safety check-ins. Dispatch is alerted if you miss one.',
    submitLabel: 'Start check-in timer',
    fields: [
      { name: 'startAt', label: 'Start time', type: 'datetime-local', required: true },
      {
        name: 'intervalMinutes',
        label: 'Check-in interval',
        type: 'select',
        required: true,
        options: [
          { value: '15', label: 'Every 15 minutes' },
          { value: '30', label: 'Every 30 minutes' },
          { value: '60', label: 'Every hour' },
          { value: '120', label: 'Every 2 hours' },
        ],
      },
      { name: 'endAt', label: 'Expected end', type: 'datetime-local', required: true },
      { name: 'location', label: 'Where will you be?', type: 'text', required: true, placeholder: 'Area or address' },
      { name: 'notes', label: 'Notes for dispatch', type: 'textarea', placeholder: 'Who to call, special instructions' },
    ],
  },
  journey: {
    kind: 'journey',
    title: 'Journey monitoring',
    summary: 'Track a trip until you arrive. Missed arrival triggers a welfare check.',
    submitLabel: 'Start journey watch',
    fields: [
      { name: 'fromLocation', label: 'From', type: 'text', required: true, placeholder: 'Pickup / start' },
      { name: 'toLocation', label: 'To', type: 'text', required: true, placeholder: 'Destination' },
      { name: 'departAt', label: 'Depart', type: 'datetime-local', required: true },
      { name: 'arriveAt', label: 'Expected arrival', type: 'datetime-local', required: true },
      {
        name: 'travelMode',
        label: 'Travel mode',
        type: 'select',
        required: true,
        options: [
          { value: 'car', label: 'Car' },
          { value: 'foot', label: 'On foot' },
          { value: 'taxi', label: 'Taxi / ride-hail' },
          { value: 'convoy', label: 'Convoy' },
        ],
      },
      {
        name: 'vehicleCount',
        label: 'Number of vehicles',
        type: 'number',
        min: 1,
        placeholder: '1',
        required: true,
        showIf: { field: 'travelMode', oneOf: ['car', 'taxi', 'convoy'] },
      },
      { name: 'hasCargo', label: 'Transporting a product or goods', type: 'checkbox' },
      {
        name: 'productType',
        label: 'Product type',
        type: 'select',
        required: true,
        showIf: { field: 'hasCargo', equals: true },
        options: [
          { value: 'cash', label: 'Cash / valuables' },
          { value: 'electronics', label: 'Electronics' },
          { value: 'pharma', label: 'Pharmaceuticals' },
          { value: 'retail', label: 'Retail stock' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        name: 'productNotes',
        label: 'Cargo notes',
        type: 'textarea',
        showIf: { field: 'hasCargo', equals: true },
        placeholder: 'Value band, packaging, special handling',
      },
      { name: 'notes', label: 'Notes for dispatch', type: 'textarea' },
    ],
  },
  escort: {
    kind: 'escort',
    title: 'Escort request',
    summary: 'Request a security escort for high-risk travel or a product move.',
    submitLabel: 'Submit escort request',
    fields: [
      { name: 'fromLocation', label: 'Pickup location', type: 'text', required: true },
      { name: 'toLocation', label: 'Destination', type: 'text', required: true },
      { name: 'whenAt', label: 'Date and time', type: 'datetime-local', required: true },
      { name: 'vehicleCount', label: 'Number of vehicles', type: 'number', required: true, min: 1, placeholder: '1' },
      { name: 'passengers', label: 'Passengers', type: 'number', min: 1, placeholder: '1' },
      {
        name: 'escortType',
        label: 'Escort type',
        type: 'select',
        required: true,
        options: [
          { value: 'unarmed', label: 'Unarmed close protection' },
          { value: 'armed', label: 'Armed escort' },
          { value: 'cash-in-transit', label: 'Cash / valuables in transit' },
          { value: 'convoy', label: 'Multi-vehicle convoy' },
        ],
      },
      { name: 'hasCargo', label: 'Transporting a product or goods', type: 'checkbox' },
      {
        name: 'productType',
        label: 'Product type',
        type: 'select',
        required: true,
        showIf: { field: 'hasCargo', equals: true },
        options: [
          { value: 'cash', label: 'Cash / valuables' },
          { value: 'electronics', label: 'Electronics' },
          { value: 'pharma', label: 'Pharmaceuticals' },
          { value: 'fuel', label: 'Fuel / chemicals' },
          { value: 'retail', label: 'Retail stock' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        name: 'productNotes',
        label: 'Cargo details',
        type: 'textarea',
        showIf: { field: 'hasCargo', equals: true },
        placeholder: 'What is being moved, value band, loading notes',
      },
      { name: 'notes', label: 'Notes for dispatch', type: 'textarea' },
    ],
  },
  wellness: {
    kind: 'wellness',
    title: 'Wellness check',
    summary: 'Request a welfare verification visit or call.',
    submitLabel: 'Request wellness check',
    fields: [
      { name: 'location', label: 'Location', type: 'text', required: true, placeholder: 'Address or area' },
      { name: 'whenAt', label: 'Preferred time', type: 'datetime-local', required: true },
      {
        name: 'checkType',
        label: 'Check type',
        type: 'select',
        required: true,
        options: [
          { value: 'visit', label: 'In-person visit' },
          { value: 'call', label: 'Phone check' },
          { value: 'door', label: 'Door knock only' },
        ],
      },
      { name: 'personName', label: 'Person to check on', type: 'text', placeholder: 'Yourself or a family member' },
      { name: 'notes', label: 'Context for responders', type: 'textarea', placeholder: 'Access notes, gate code, concerns' },
    ],
  },
  roadside: {
    kind: 'roadside',
    title: 'Roadside assistance',
    summary: 'Request breakdown or roadside support.',
    submitLabel: 'Request roadside help',
    fields: [
      { name: 'location', label: 'Current location', type: 'text', required: true, placeholder: 'Road, suburb, landmark' },
      { name: 'vehiclePlate', label: 'Vehicle registration', type: 'text', required: true, placeholder: 'ND 123-456' },
      {
        name: 'issue',
        label: 'Issue',
        type: 'select',
        required: true,
        options: [
          { value: 'breakdown', label: 'Breakdown' },
          { value: 'flat', label: 'Flat tyre' },
          { value: 'battery', label: 'Battery / jump start' },
          { value: 'fuel', label: 'Out of fuel' },
          { value: 'lockout', label: 'Lockout' },
          { value: 'accident', label: 'Accident (non-emergency)' },
        ],
      },
      { name: 'whenAt', label: 'When do you need help?', type: 'datetime-local' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  'share-location': {
    kind: 'share-location',
    title: 'Live location sharing',
    summary: 'Share GPS with dispatch and selected family for a set window.',
    submitLabel: 'Start sharing',
    fields: [
      {
        name: 'durationMinutes',
        label: 'Share for',
        type: 'select',
        required: true,
        options: [
          { value: '30', label: '30 minutes' },
          { value: '60', label: '1 hour' },
          { value: '180', label: '3 hours' },
          { value: '480', label: '8 hours' },
        ],
      },
      {
        name: 'shareWith',
        label: 'Share with',
        type: 'select',
        required: true,
        options: [
          { value: 'dispatch', label: 'Dispatch only' },
          { value: 'family', label: 'Dispatch and family' },
          { value: 'contacts', label: 'Dispatch and emergency contacts' },
        ],
      },
      { name: 'location', label: 'Starting point (optional)', type: 'text', placeholder: 'Current area' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
};

export function isServiceRequestKind(value: string): value is ServiceRequestKind {
  return (SERVICE_REQUEST_KINDS as readonly string[]).includes(value);
}

export function fieldVisible(field: ServiceField, values: Record<string, string | boolean>): boolean {
  if (!field.showIf) return true;
  const actual = values[field.showIf.field];
  if (field.showIf.oneOf) return field.showIf.oneOf.includes(actual);
  return actual === field.showIf.equals;
}
