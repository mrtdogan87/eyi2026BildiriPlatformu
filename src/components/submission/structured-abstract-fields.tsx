'use client';
import { abstractSectionKeys, abstractSectionLabels, emptyStructuredAbstract, wordCount, type StructuredAbstract } from '@/modules/participation/abstract';
import type { CongressConfiguration } from '@/modules/congress/configuration';

export function StructuredAbstractFields({ value, onChange, config, language, disabled }: { value?: StructuredAbstract; onChange: (value: StructuredAbstract) => void; config: CongressConfiguration; language: 'TR' | 'EN'; disabled: boolean }) {
  const values = value ?? emptyStructuredAbstract();
  return <fieldset disabled={disabled}><legend>{language === 'TR' ? 'Yapılandırılmış özet' : 'Structured abstract'}</legend>
    <p className="field-hint">{language === 'TR' ? 'Kelime sayısı, harf veya sayı içeren ve boşlukla ayrılan sözcüklere göre hesaplanır.' : 'Words are whitespace-separated tokens containing letters or numbers.'}</p>
    {abstractSectionKeys.map(key => { const rule = config.structuredAbstract.sections[language][key]; const count = wordCount(values[language][key]); return <label key={key} className="field">{abstractSectionLabels[language][key]}{rule.required ? ' *' : language === 'TR' ? ' (İsteğe bağlı)' : ' (Optional)'}<textarea maxLength={50000} rows={4} required={rule.required} value={values[language][key]} onChange={event => onChange({ ...values, [language]: { ...values[language], [key]: event.target.value } })}/><span className={count > rule.maxWords ? 'error' : 'field-hint'}>{count} / {rule.maxWords} {language === 'TR' ? 'kelime' : 'words'}</span></label>; })}
  </fieldset>;
}
