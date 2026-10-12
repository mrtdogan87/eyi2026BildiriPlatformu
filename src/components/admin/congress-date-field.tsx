'use client';

import { useId } from 'react';
import { congressDateTimeIso, congressDateTimeValue, congressDateWithTime } from '@/modules/congress/dates';

export function CongressDateField({ label, value, onChange, defaultTime = '23:59', required = false, hint }: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  defaultTime?: '00:00' | '23:59';
  required?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [date = '', selectedTime] = congressDateTimeValue(value).split('T');
  return <div className="field">
    <label htmlFor={`${id}-date`}>{label}{required ? ' *' : ''}</label>
    <div className="grid two">
      <input id={`${id}-date`} aria-label={`${label} — tarih`} aria-describedby={`${id}-hint`} type="date" required={required} value={date} onChange={event => onChange(congressDateWithTime(event.target.value, value, defaultTime))}/>
      <input aria-label={`${label} — saat (Türkiye)`} aria-describedby={`${id}-hint`} type="time" required={!!date} disabled={!date} value={selectedTime || defaultTime} onChange={event => {
        const changed = congressDateTimeIso(`${date}T${event.target.value}`, value);
        if (changed) onChange(changed);
      }}/>
    </div>
    <span id={`${id}-hint`} className="field-hint">{hint ? `${hint} ` : ''}Türkiye saati (İstanbul). İlk tarih seçiminde {defaultTime}; saati değiştirebilirsiniz.</span>
  </div>;
}
