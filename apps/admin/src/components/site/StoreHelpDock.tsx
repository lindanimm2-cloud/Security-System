'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { whatsappHref } from '@/lib/call-utils';
import { useCart } from './CartProvider';

const DEMO_WHATSAPP = '27110000000';

type ChatRole = 'bot' | 'user';
type ChatMessage = { id: string; role: ChatRole; text: string };

const STARTERS = [
  'Which CCTV kit for a home?',
  'Do I need a licence?',
  'Install lead times?',
  'Loyalty / promo codes?',
];

function replyFor(input: string): string {
  const q = input.toLowerCase();
  if (/licence|license|psira|firearm/.test(q)) {
    return 'Some kit (body armour, certain radios, regulated gear) needs a valid licence before fulfilment. Add items to cart — checkout flags licence lines and sales will verify before shipping. Demo only: no real verification runs.';
  }
  if (/cctv|camera|nvr|dvr|surveillance/.test(q)) {
    return 'For most homes we recommend a 4–8 channel IP kit with night vision and remote app viewing. Open Shop → CCTV or Packages, or ask WhatsApp sales for a site-specific quote. This is a demo assistant — not live monitoring advice.';
  }
  if (/alarm|panic|armed|response/.test(q)) {
    return 'Alarms and panic gear are under Alarms / Packages. Live armed response needs a protection subscription + portal invite (demo code NX-DEMO01). Store checkout creates a sales follow-up in the control room.';
  }
  if (/install|lead|how long|when|schedule/.test(q)) {
    return 'Demo lead times: standard CCTV / alarm installs are typically quoted 3–10 working days after site survey. Add a note at checkout with preferred windows — sales confirms after order.';
  }
  if (/price|cost|quote|r\s?\d|promo|loyalty|discount|code/.test(q)) {
    return 'Prices on the store are live demo catalogue. Signed-in shop accounts can apply loyalty / promo codes at checkout (e.g. demo GEAR15 when available). For custom quotes, use WhatsApp sales.';
  }
  if (/fence|gate|access|biometric/.test(q)) {
    return 'Browse Electric fencing, Gates, or Access control in the store departments rail. Heavy installs usually need a site visit — WhatsApp sales or Contact can book that.';
  }
  if (/hello|hi|hey|help/.test(q)) {
    return 'Hi — I’m the Nexus store demo assistant. Ask about CCTV, alarms, licences, installs, or promos. For a human, tap WhatsApp.';
  }
  return 'I can help with catalogue departments, licences, installs, and checkout in this demo. Try “CCTV kit”, “licence”, or “install lead times” — or open WhatsApp for a sales chat.';
}

function WhatsAppGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function AssistGlyph({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3a4 4 0 0 1 4 4v1h1a3 3 0 0 1 0 6h-1v1a4 4 0 0 1-8 0v-1H7a3 3 0 0 1 0-6h1V7a4 4 0 0 1 4-4Z" />
      <circle cx="9.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.5 14.5c.8.7 1.7 1 2.5 1s1.7-.3 2.5-1" />
    </svg>
  );
}

export function StoreHelpDock() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Nexus demo assistant — ask about products, licences, installs, or checkout. For a human sales chat, use WhatsApp.',
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onStore = pathname === '/store' || pathname.startsWith('/store/');
  const waText = useMemo(() => {
    const base =
      'Hi 4DS Nexus sales — I need help with the demo store catalogue.';
    if (cartCount > 0) {
      return `${base} I currently have ${cartCount} item${cartCount === 1 ? '' : 's'} in my cart.`;
    }
    return base;
  }, [cartCount]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing, open]);

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  function pushBot(text: string) {
    setTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `b-${Date.now()}`, role: 'bot', text },
      ]);
      setTyping(false);
    }, 550 + Math.min(900, text.length * 8));
  }

  function sendText(raw: string) {
    const text = raw.trim();
    if (!text || typing) return;
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', text },
    ]);
    setDraft('');
    pushBot(replyFor(text));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    sendText(draft);
  }

  if (!onStore) return null;

  return (
    <div
      className={`nx-help-dock ${cartCount > 0 ? 'nx-help-dock--cart-up' : ''}`}
    >
      {open && (
        <div
          className="nx-assist-panel"
          role="dialog"
          aria-label="Nexus AI assistant"
        >
          <header className="nx-assist-panel__head">
            <div>
              <p className="nx-assist-panel__eyebrow">Demo · on-site</p>
              <strong>Nexus AI assistant</strong>
            </div>
            <button
              type="button"
              className="nx-assist-panel__close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              ×
            </button>
          </header>

          <div className="nx-assist-panel__messages" ref={listRef}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`nx-assist-bubble nx-assist-bubble--${m.role}`}
              >
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="nx-assist-bubble nx-assist-bubble--bot nx-assist-bubble--typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          <div className="nx-assist-starters">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={typing}
                onClick={() => sendText(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <form className="nx-assist-compose" onSubmit={onSubmit}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about gear, licences, installs…"
              aria-label="Message assistant"
              disabled={typing}
            />
            <button type="submit" disabled={typing || !draft.trim()}>
              Send
            </button>
          </form>
          <p className="nx-assist-panel__fine">
            Demo replies only — not live advice. Prefer WhatsApp for sales.
          </p>
        </div>
      )}

      <div className="nx-help-dock__actions">
        <button
          type="button"
          className={`nx-help-fab nx-help-fab--ai ${open ? 'is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
          title="AI assistant"
        >
          <AssistGlyph />
          <span className="nx-help-fab__label">AI</span>
        </button>

        <a
          className="nx-help-fab nx-help-fab--wa"
          href={whatsappHref(DEMO_WHATSAPP, waText)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp (demo)"
          title="WhatsApp sales (demo)"
        >
          <WhatsAppGlyph />
          <span className="nx-help-fab__label">WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
