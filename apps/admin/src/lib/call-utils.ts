import type { CallChannel } from '@/types/calls';

export function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function channelLabel(channel: CallChannel): string {
  switch (channel) {
    case 'INTERNAL':
      return 'Internal';
    case 'WHATSAPP':
      return 'WhatsApp';
    case 'DISPATCH_LINE':
      return 'Dispatch line';
    case 'EXTERNAL':
      return 'External';
    default:
      return channel;
  }
}

export function isExternalCallChannel(channel: CallChannel): boolean {
  return channel === 'WHATSAPP' || channel === 'EXTERNAL' || channel === 'DISPATCH_LINE';
}

export function channelLiveSubtitle(
  channel: CallChannel,
  status: string,
  elapsedSec: number,
): string {
  if (channel === 'WHATSAPP') {
    return 'Call continues in WhatsApp · log notes here';
  }
  if (channel === 'EXTERNAL') {
    return 'Call continues on phone · log notes here';
  }
  if (channel === 'DISPATCH_LINE') {
    return 'Call continues on dispatch line · log notes here';
  }
  if (status === 'RINGING') return 'Ringing…';
  if (status === 'ON_HOLD') return 'On hold';
  if (['CONNECTED', 'ON_HOLD'].includes(status)) {
    return formatCallDuration(elapsedSec);
  }
  return channelLabel(channel);
}

export function formatCallHistoryMeta(
  channel: CallChannel,
  durationSec: number | null,
): string | null {
  if (channel === 'WHATSAPP') return 'Opened in WhatsApp';
  if (channel === 'EXTERNAL') return 'Phone call';
  if (channel === 'DISPATCH_LINE') return 'Dispatch line';
  if (durationSec != null) return formatCallDuration(durationSec);
  return null;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function telHref(phone: string): string {
  return `tel:${normalizePhone(phone)}`;
}

export function whatsappHref(phone: string, text?: string): string {
  const digits = normalizePhone(phone).replace(/^\+/, '');
  const base = `https://wa.me/${digits}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function whatsappCallHref(phone: string): string {
  const digits = normalizePhone(phone).replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}
