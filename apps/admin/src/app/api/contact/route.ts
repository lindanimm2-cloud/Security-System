import { NextResponse } from 'next/server';

type AddressDetails = {
  street?: string;
  suburb?: string;
  city?: string;
  postalCode?: string;
  landmark?: string;
};

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  interest?: string;
  kind?: string;
  message?: string;
  date?: string;
  time?: string;
  endDate?: string;
  people?: string;
  pickup?: string;
  destination?: string;
  location?: string;
  propertyType?: string;
  pickupDetails?: AddressDetails;
  destinationDetails?: AddressDetails;
  siteDetails?: AddressDetails;
  returnTrip?: string;
  vehicles?: string;
  submittedAt?: string;
};

export async function POST(request: Request) {
  let body: ContactPayload = {};
  try {
    body = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  if (!name || !email) {
    return NextResponse.json(
      { ok: false, error: 'Name and email are required' },
      { status: 400 },
    );
  }

  // Demo / local: acknowledge the request. Wire to CRM/email in production.
  if (process.env.NODE_ENV !== 'production') {
    console.info('[contact]', {
      kind: body.kind ?? 'inquiry',
      interest: body.interest,
      name,
      email,
      phone: body.phone,
      date: body.date,
      people: body.people,
      pickup: body.pickup,
      destination: body.destination,
      location: body.location,
      propertyType: body.propertyType,
    });
  }

  const interest = String(body.interest ?? 'other').trim() || 'other';

  return NextResponse.json({
    ok: true,
    interest,
    // Real engagement id is created client-side in demo (localStorage).
    receivedAt: body.submittedAt || new Date().toISOString(),
  });
}
