'use client';

import type { ReactNode } from 'react';

export type SplitAddressValue = {
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
};

type SplitAddressFieldsProps = {
  value: SplitAddressValue;
  onChange: (next: SplitAddressValue) => void;
  title?: string;
  required?: boolean;
  variant?: 'login' | 'form';
  gateCode?: string;
  onGateCodeChange?: (value: string) => void;
  gateLabel?: string;
  showGate?: boolean;
};

function FieldShell({
  variant,
  label,
  children,
  className = '',
}: {
  variant: 'login' | 'form';
  label: string;
  children: ReactNode;
  className?: string;
}) {
  if (variant === 'login') {
    return (
      <label className={`login-field ${className}`.trim()}>
        <span>{label}</span>
        <span className="login-input-wrap">{children}</span>
      </label>
    );
  }
  return (
    <label className={`form-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function SplitAddressFields({
  value,
  onChange,
  title,
  required = true,
  variant = 'form',
  gateCode,
  onGateCodeChange,
  gateLabel = 'Gate / access notes (optional)',
  showGate = false,
}: SplitAddressFieldsProps) {
  const rowClass = variant === 'login' ? 'register-row-2' : 'split-address__row';

  function patch(partial: Partial<SplitAddressValue>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="split-address">
      {title ? <p className="split-address__title">{title}</p> : null}

      <FieldShell
        variant={variant}
        label="Street address"
        className={variant === 'form' ? 'form-field--full' : ''}
      >
        <input
          value={value.street}
          onChange={(e) => patch({ street: e.target.value })}
          placeholder="12 Example Road"
          required={required}
          autoComplete="street-address"
        />
      </FieldShell>

      <div className={rowClass}>
        <FieldShell variant={variant} label="Suburb">
          <input
            value={value.suburb}
            onChange={(e) => patch({ suburb: e.target.value })}
            placeholder="e.g. Umhlanga Rocks"
            required={required}
            autoComplete="address-level2"
          />
        </FieldShell>
        <FieldShell variant={variant} label="City / town">
          <input
            value={value.city}
            onChange={(e) => patch({ city: e.target.value })}
            placeholder="e.g. Durban"
            required={required}
            autoComplete="address-level1"
          />
        </FieldShell>
      </div>

      <div className={rowClass}>
        <FieldShell variant={variant} label="Postal code">
          <input
            value={value.postalCode}
            onChange={(e) =>
              patch({ postalCode: e.target.value.replace(/[^\dA-Za-z ]/g, '').slice(0, 10) })
            }
            placeholder="e.g. 4319"
            required={required}
            inputMode="numeric"
            autoComplete="postal-code"
          />
        </FieldShell>
        {showGate && onGateCodeChange ? (
          <FieldShell variant={variant} label={gateLabel}>
            <input
              value={gateCode ?? ''}
              onChange={(e) => onGateCodeChange(e.target.value)}
              placeholder="Loading bay code, security desk…"
              autoComplete="off"
            />
          </FieldShell>
        ) : null}
      </div>
    </div>
  );
}
