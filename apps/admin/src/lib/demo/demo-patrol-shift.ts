/** Demo shift patrol photo stops — officers photograph sites they service. */

export type PatrolPhotoCapture = {
  id: string;
  capturedAt: string;
  note?: string;
  lat?: number | null;
  lng?: number | null;
  dataUrl?: string | null;
  fileName?: string;
};

export type PatrolPhotoStop = {
  id: string;
  siteName: string;
  address: string;
  zone: string;
  /** Client / contract requires a site photo this shift. */
  required: boolean;
  instruction: string;
  minPhotos: number;
  status: 'PENDING' | 'DONE' | 'SKIPPED';
  dueLabel: string;
  photos: PatrolPhotoCapture[];
};

export type OfficerPatrolShift = {
  shiftId: string;
  shiftLabel: string;
  officerName: string;
  startedAt: string;
  endsAt: string;
  notes: string;
  stops: PatrolPhotoStop[];
};

const now = Date.now();

export const demoOfficerPatrolShift: OfficerPatrolShift = {
  shiftId: 'shift-demo-1',
  shiftLabel: 'Day shift · Zone A–C',
  officerName: 'Sipho Ndlovu',
  startedAt: new Date(now - 3 * 60 * 60_000).toISOString(),
  endsAt: new Date(now + 5 * 60 * 60_000).toISOString(),
  notes:
    'Photograph each required site from the main entrance. Clear house number / gate signage must be visible.',
  stops: [
    {
      id: 'stop-1',
      siteName: 'Gateway Office Park',
      address: '1 Palm Blvd, Umhlanga Ridge',
      zone: 'Zone A',
      required: true,
      instruction: 'Main gate + lobby entrance (both sides of signage).',
      minPhotos: 2,
      status: 'DONE',
      dueLabel: 'Before 12:00',
      photos: [
        {
          id: 'ph-1a',
          capturedAt: new Date(now - 90 * 60_000).toISOString(),
          note: 'Main gate',
          lat: -29.725,
          lng: 31.065,
          dataUrl: null,
          fileName: 'gate-front.jpg',
        },
        {
          id: 'ph-1b',
          capturedAt: new Date(now - 88 * 60_000).toISOString(),
          note: 'Lobby entrance',
          lat: -29.7251,
          lng: 31.0652,
          dataUrl: null,
          fileName: 'lobby.jpg',
        },
      ],
    },
    {
      id: 'stop-2',
      siteName: 'James Demo — Glenwood',
      address: '14 Esther Roberts Rd, Glenwood',
      zone: 'Zone B',
      required: true,
      instruction: 'Front gate with house number clearly readable.',
      minPhotos: 1,
      status: 'PENDING',
      dueLabel: 'Next visit',
      photos: [],
    },
    {
      id: 'stop-3',
      siteName: 'Thabo Retail',
      address: 'Shop 12, Prospecton Retail Park',
      zone: 'Zone C',
      required: true,
      instruction: 'Storefront shutters + side alley access door.',
      minPhotos: 2,
      status: 'PENDING',
      dueLabel: 'Close-down round',
      photos: [],
    },
    {
      id: 'stop-4',
      siteName: 'Hillcrest Estate — North wall',
      address: 'Hillcrest Estate perimeter',
      zone: 'Zone B',
      required: false,
      instruction: 'Optional — only if fence damage or suspicious activity.',
      minPhotos: 1,
      status: 'PENDING',
      dueLabel: 'If needed',
      photos: [],
    },
    {
      id: 'stop-5',
      siteName: 'Ridge Clinic',
      address: '8 Ridge Rd, Berea',
      zone: 'Zone A',
      required: true,
      instruction: 'Ambulance bay and staff entrance.',
      minPhotos: 1,
      status: 'PENDING',
      dueLabel: 'Before end of shift',
      photos: [],
    },
  ],
};

export function patrolShiftSummary(shift: OfficerPatrolShift = demoOfficerPatrolShift) {
  const required = shift.stops.filter((s) => s.required);
  const requiredDone = required.filter((s) => s.status === 'DONE').length;
  const optionalDone = shift.stops.filter((s) => !s.required && s.status === 'DONE').length;
  return {
    totalStops: shift.stops.length,
    requiredTotal: required.length,
    requiredDone,
    requiredRemaining: Math.max(0, required.length - requiredDone),
    optionalDone,
    photosTaken: shift.stops.reduce((n, s) => n + s.photos.length, 0),
    progressPct:
      required.length === 0
        ? 100
        : Math.round((requiredDone / required.length) * 100),
  };
}

export function markPatrolStopPhoto(
  stopId: string,
  photo: Omit<PatrolPhotoCapture, 'id'> & { id?: string },
) {
  const stop = demoOfficerPatrolShift.stops.find((s) => s.id === stopId);
  if (!stop) return null;
  const entry: PatrolPhotoCapture = {
    id: photo.id ?? `ph-${Date.now()}`,
    capturedAt: photo.capturedAt,
    note: photo.note,
    lat: photo.lat ?? null,
    lng: photo.lng ?? null,
    dataUrl: photo.dataUrl ?? null,
    fileName: photo.fileName,
  };
  stop.photos.push(entry);
  if (stop.photos.length >= stop.minPhotos) {
    stop.status = 'DONE';
  }
  return { stop, shift: demoOfficerPatrolShift, summary: patrolShiftSummary() };
}
