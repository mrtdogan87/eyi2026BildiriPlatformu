export const ACADEMIC_TITLES = [
  "Prof. Dr.",
  "Doç. Dr.",
  "Dr. Öğr. Üyesi",
  "Dr.",
  "Arş. Gör.",
  "Öğr. Gör.",
  "Uzm.",
  "Öğrenci",
  "Diğer",
] as const;

export const OTHER_TITLE = "Diğer";

export type AcademicTitle = (typeof ACADEMIC_TITLES)[number];
