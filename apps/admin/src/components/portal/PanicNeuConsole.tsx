'use client';

import Link from 'next/link';
import {
  FirePanicIcon,
  HubPanicIcon,
  MedicalPanicIcon,
  PanicAlertIcon,
  SilentPanicIcon,
} from '@/components/portal/PanicNeuIcons';
import { PanicNeuButton } from '@/components/portal/PanicNeuButton';

export type PanicNeuBusy = 'panic' | 'silent' | 'medical' | 'fire' | null;

type Props = {
  busy: PanicNeuBusy;
  onPanic: () => void | Promise<void>;
  onSilent: () => void | Promise<void>;
  onMedical?: () => void | Promise<void>;
  onFire?: () => void | Promise<void>;
  showMedical?: boolean;
  showHub?: boolean;
  hubHref?: string;
  className?: string;
  id?: string;
};

function isDisabled(busy: PanicNeuBusy, key: PanicNeuBusy) {
  return busy != null && busy !== key;
}

export function PanicNeuConsole({
  busy,
  onPanic,
  onSilent,
  onMedical,
  onFire,
  showMedical = true,
  showHub = false,
  hubHref = '/portal/emergency',
  className = '',
  id,
}: Props) {
  const showFire = Boolean(onFire);
  const showMed = showMedical && Boolean(onMedical);

  return (
    <section
      id={id}
      className={`panic-tray panic-neu ${className}`.trim()}
      aria-label="Emergency controls"
    >
      <div className="panic-neu__main">
        <PanicNeuButton
          label="Panic"
          holdMs={3000}
          size="lg"
          showIndicator
          tone="danger"
          loading={busy === 'panic'}
          disabled={isDisabled(busy, 'panic')}
          onActivate={onPanic}
          icon={<PanicAlertIcon />}
        />
      </div>

      <p className="panic-note">Release to cancel</p>

      <div className="panic-neu__row">
        <PanicNeuButton
          label="Silent Panic. Hold 2 seconds to notify control room discreetly."
          holdMs={2000}
          tone="warn"
          loading={busy === 'silent'}
          disabled={isDisabled(busy, 'silent')}
          onActivate={onSilent}
          icon={<SilentPanicIcon />}
        />

        {showMed ? (
          <PanicNeuButton
            label="Medical emergency. Hold 2 seconds."
            holdMs={2000}
            tone="medical"
            loading={busy === 'medical'}
            disabled={isDisabled(busy, 'medical')}
            onActivate={onMedical!}
            icon={<MedicalPanicIcon />}
          />
        ) : null}

        {showFire ? (
          <PanicNeuButton
            label="Fire emergency. Hold 2 seconds."
            holdMs={2000}
            tone="warn"
            loading={busy === 'fire'}
            disabled={isDisabled(busy, 'fire')}
            onActivate={onFire!}
            icon={<FirePanicIcon />}
          />
        ) : null}
      </div>

      <div className="panic-neu__legend">
        <span>Silent</span>
        {showMed ? <span>Medical</span> : null}
        {showFire ? <span>Fire</span> : null}
      </div>

      {showHub ? (
        <div className="panic-neu__hub">
          <Link href={hubHref} className="panic-neu__hub-link" aria-label="Open emergency hub">
            <div className="panic-neu__well">
              <span className="panic-neu__knob panic-neu__knob--static">
                <HubPanicIcon />
              </span>
            </div>
            <span className="panic-neu__hub-label">Hub</span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
