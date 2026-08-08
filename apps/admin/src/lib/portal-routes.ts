export function activityHref(title: string, detail: string): string {
  const text = `${title} ${detail}`.toLowerCase();
  if (text.includes('location') || text.includes('gps') || text.includes('tracking')) return '/portal/location';
  if (text.includes('panic') || text.includes('incident') || text.includes('theft') || text.includes('dispatch')) {
    return '/portal/incidents';
  }
  if (text.includes('subscription') || text.includes('protection plan') || text.includes('premium')) {
    return '/portal/subscription';
  }
  if (text.includes('safe zone') || text.includes('family') || text.includes('entered')) return '/portal/family';
  if (text.includes('vehicle') || text.includes('geofence')) return '/portal/vehicles';
  if (text.includes('alarm') || text.includes('home') || text.includes('property')) return '/portal/home';
  if (text.includes('medical')) return '/portal/medical';
  if (text.includes('message')) return '/portal/family/chat';
  return '/portal/updates';
}

export function phoneHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}
