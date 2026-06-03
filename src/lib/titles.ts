export const ACADEMIC_TITLES = [
  "Prof. Dr.",
  "Doç. Dr.",
  "Dr. Öğr. Üyesi",
  "Dr.",
  "Arş. Gör.",
  "Öğr. Gör.",
  "Uzm.",
  "Öğrenci (Lisans)",
  "Öğrenci (Yüksek Lisans)",
  "Öğrenci (Doktora)",
  "Diğer",
] as const;

export const OTHER_TITLE = "Diğer";

export type AcademicTitle = (typeof ACADEMIC_TITLES)[number];

type TitleLabelLocale = "tr" | "en";

const ACADEMIC_TITLE_LABELS: Record<AcademicTitle, Record<TitleLabelLocale, string>> = {
  "Prof. Dr.": { tr: "Prof. Dr.", en: "Prof. Dr." },
  "Doç. Dr.": { tr: "Doç. Dr.", en: "Assoc. Prof. Dr." },
  "Dr. Öğr. Üyesi": { tr: "Dr. Öğr. Üyesi", en: "Asst. Prof. Dr." },
  "Dr.": { tr: "Dr.", en: "Dr." },
  "Arş. Gör.": { tr: "Arş. Gör.", en: "Research Assistant" },
  "Öğr. Gör.": { tr: "Öğr. Gör.", en: "Lecturer" },
  "Uzm.": { tr: "Uzm.", en: "Specialist" },
  "Öğrenci (Lisans)": { tr: "Öğrenci (Lisans)", en: "Student (Undergraduate)" },
  "Öğrenci (Yüksek Lisans)": { tr: "Öğrenci (Yüksek Lisans)", en: "Student (Master's)" },
  "Öğrenci (Doktora)": { tr: "Öğrenci (Doktora)", en: "Student (Doctorate)" },
  Diğer: { tr: "Diğer", en: "Other" },
};

export function academicTitleLabel(
  title: AcademicTitle,
  locale: TitleLabelLocale = "tr",
) {
  return ACADEMIC_TITLE_LABELS[title][locale];
}
