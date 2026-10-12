export const congressTimeZone = 'Europe/Istanbul';

export const congressDateLabels = {
  eventStartsAt: { tr: 'Kongre başlangıcı', en: 'Congress starts' },
  eventEndsAt: { tr: 'Kongre bitişi', en: 'Congress ends' },
  earlyDeadline: { tr: 'Erken kayıt son tarihi', en: 'Early registration deadline' },
  lateDeadline: { tr: 'Geç kayıt son tarihi', en: 'Late registration deadline' },
} as const;

export const stageDeadlineLabels = {
  ABSTRACT: { tr: 'Bildiri özeti son gönderim tarihi', en: 'Abstract submission deadline' },
  FULL_TEXT: { tr: 'Tam metin son gönderim tarihi', en: 'Full-text submission deadline' },
  PARTICIPATION: { tr: 'Sunum bilgileri', en: 'Presentation details' },
  PAYMENT: { tr: 'Kayıt ve ödeme son tarihi', en: 'Registration and payment deadline' },
} as const;

export const stageDateDescriptions = {
  ABSTRACT: 'Bildiri özeti ve ilk başvuru bilgilerinin gönderilebileceği son tarih. Süre dolduğunda genel gönderim kapanır; verilmiş süreli teslim izinleri ayrıca değerlendirilir.',
  FULL_TEXT: 'Tam metin dosyasının gönderilebileceği son tarih. Özet son tarihinden bağımsızdır; verilmiş süreli teslim izinleri ayrıca değerlendirilir.',
  PARTICIPATION: 'Sunum şekli ve akademik statü, bildirinin teslim aşamasıyla birlikte alınır. Bu bilgiler için ayrı bir son tarih yoktur.',
  PAYMENT: 'Ücretli yeni kayıt işlemleri için genel son sınır. Geç kayıt son tarihi de girilmişse önce dolan sınır uygulanır. Bildiri özeti veya tam metin gönderimini kapatmaz.',
} as const;

export const registrationDateDescriptions = {
  earlyDeadline: 'Bu tarihe kadar erken kayıt tarifesi, sonrasında geç kayıt tarifesi uygulanır. Boş bırakılırsa geç kayıt tarifesi baştan uygulanır.',
  lateDeadline: 'Geç kayıt tarifesinin son günü ve saati. Sonrasında ücretli yeni kayıt işlemleri kapanır. Boşsa bu alandan kapanış uygulanmaz; kayıt ve ödeme son tarihi ayrıca geçerlidir. Bildiri gönderimi bu alanla kapanmaz.',
} as const;

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: congressTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** An input value in Istanbul time, independent of the browser's time zone. */
export function congressDateTimeValue(value: Date | string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = Object.fromEntries(formatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Convert an Istanbul wall-clock input to an instant without parsing it in device time. */
export function congressDateTimeIso(value: string, previous?: string | null): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  if (previous && congressDateTimeValue(previous) === value) return previous;
  const wallClock = new Date(`${value}:00Z`).getTime();
  if (!Number.isFinite(wallClock)) return null;
  let instant = wallClock;
  for (let attempt = 0; attempt < 3; attempt++) {
    const displayed = congressDateTimeValue(new Date(instant));
    if (displayed === value) return new Date(instant).toISOString();
    instant += wallClock - new Date(`${displayed}:00Z`).getTime();
  }
  return null;
}

/** A new date uses the default; changing an existing date retains its chosen hour. */
export function congressDateWithTime(date: string, previous: string | null, defaultTime: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = congressDateTimeValue(previous).split('T')[1] || defaultTime;
  return congressDateTimeIso(`${date}T${time}`, previous);
}
