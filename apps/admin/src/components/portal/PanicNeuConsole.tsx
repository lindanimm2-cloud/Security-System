'use client';

import Link from 'next/link';
import {
  FirePanicIcon,
  HubPanicIcon,
  MedicalPanicIcon,
  PanicAlertIcon,
  SilentPanicIcon,
  VehiclePanicIcon,
} from '@/components/portal/PanicNeuIcons';
import { PanicNeuButton } from '@/components/portal/PanicNeuButton';

export type PanicNeuBusy = 'panic' | 'silent' | 'medical' | 'fire' | 'vehicle' | null;

type Props = {
  busy: PanicNeuBusy;
  onPanic: () => void | Promise<void>;
  onSilent: () => void | Promise<void>;
  onMedical?: () => void | Promise<void>;
  onFire?: () => void | Promise<void>;
  onVehicle?: () => void | Promise<void>;
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
  onVehicle,
  showMedical = true,
  showHub = false,
  hubHref = '/portal/emergency',
  className = '',
  id,
}: Props) {
  const showFire = Boolean(onFire);
  const showMed = showMedical && Boolean(onMedical);
  const showVehicle = Boolean(onVehicle);

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
          variant="panic"
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
          variant="silent"
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
            variant="medical"
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
            variant="fire"
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

      {showVehicle || showHub ? (
        <div className="panic-neu__aux">
          {showVehicle ? (
            <div className="panic-neu__aux-item">
              <PanicNeuButton
                label="Vehicle panic. Hold 2 seconds to alert control room and open dash cameras."
                holdMs={2000}
                variant="vehicle"
                tone="danger"
                loading={busy === 'vehicle'}
                disabled={isDisabled(busy, 'vehicle')}
                onActivate={onVehicle!}
                icon={<VehiclePanicIcon />}
              />
              <span className="panic-neu__hub-label">Vehicle</span>
            </div>
          ) : null}
          {showHub ? (
            <Link href={hubHref} className="panic-neu__hub-link" aria-label="Open emergency hub">
              <div className="panic-neu__well panic-neu__well--hub">
                <span className="panic-neu__knob panic-neu__knob--static">
                  <HubPanicIcon />
                </span>
              </div>
              <span className="panic-neu__hub-label">Hub</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
