'use client';

import { UiSelect } from '@/components/ui/UiSelect';
import {
  DEFAULT_PHONE_COUNTRY,
  phoneCountrySelectOptions,
} from '@/lib/phone-countries';

type PhoneWithCountryFieldProps = {
  label: string;
  countryIso: string;
  nationalNumber: string;
  onCountryChange: (iso: string) => void;
  onNumberChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  variant?: 'login' | 'form';
};

export function PhoneWithCountryField({
  label,
  countryIso,
  nationalNumber,
  onCountryChange,
  onNumberChange,
  required,
  autoComplete = 'tel-national',
  placeholder = '82 000 0000',
  className = '',
  variant = 'login',
}: PhoneWithCountryFieldProps) {
  const fieldClass = variant === 'form' ? 'form-field' : 'login-field';

  return (
    <label className={`${fieldClass} login-phone-field ${className}`.trim()}>
      <span>{label}</span>
      <div className="login-phone-field__row">
        <span
          className={`login-input-wrap login-input-wrap--dial ${variant === 'form' ? 'login-input-wrap--form' : ''}`.trim()}
        >
          <UiSelect
            value={countryIso || DEFAULT_PHONE_COUNTRY}
            onChange={onCountryChange}
            options={phoneCountrySelectOptions()}
            ariaLabel={`${label} country code`}
            compact={false}
            className="form-field-select login-phone-field__select"
            searchable
            searchPlaceholder="Search country"
          />
        </span>
        <span
          className={`login-input-wrap login-input-wrap--tel ${variant === 'form' ? 'login-input-wrap--form' : ''}`.trim()}
        >
          <input
            type="tel"
            value={nationalNumber}
            onChange={(e) => onNumberChange(e.target.value.replace(/[^\d\s()-]/g, '').slice(0, 18))}
            placeholder={placeholder}
            required={required}
            autoComplete={autoComplete}
            inputMode="tel"
          />
        </span>
      </div>
    </label>
  );
}
