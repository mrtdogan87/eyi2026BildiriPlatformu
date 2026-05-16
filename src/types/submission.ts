export type SubmissionLanguage = "TR" | "EN";
export type PresentationMode = "ONLINE" | "IN_PERSON";
export type AudienceType = "ACADEMIC" | "STUDENT";
export type AttendeeRole = "PRESENTER" | "LISTENER";
export type PaymentPeriod = "EARLY" | "LATE";
export type PaperOrder = 1 | 2;
export type RegistrationKind = "PAPERS" | "LISTENER";

export type SubmissionAuthorInput = {
  id?: string;
  fullName: string;
  email: string;
  institution: string;
  country: string;
  isPresenter: boolean;
};

export type SubmissionDetailsInput = {
  submissionLanguage: SubmissionLanguage;
  titleTr: string;
  titleEn: string;
  abstractTr: string;
  abstractEn: string;
  keywordsTr: string;
  keywordsEn: string;
};

export type SubmissionParticipationInput = {
  presentationMode: PresentationMode;
  audience: AudienceType;
};

export type CongressBankInfo = {
  bankName: string;
  bankAccountHolder: string;
  bankIban: string;
  bankBranch: string;
};

export type CongressGalaInfo = {
  amount: number;
  currency: string;
  note: string;
};

export type CongressTripInfo = {
  note: string;
};

export type PaymentTierOption = {
  id: string;
  presentationMode: PresentationMode | null;
  role: AttendeeRole;
  audience: AudienceType | null;
  paperOrder: PaperOrder | null;
  period: PaymentPeriod | null;
  amount: number;
  currency: string;
  label: string;
};

export type SubmissionConfig = {
  congressName: string;
  congressSlug: string;
  earlyDeadline: string | null;
  lateDeadline: string | null;
  currentPeriod: PaymentPeriod | null;
  tiers: PaymentTierOption[];
};

export type SubmissionSnapshot = SubmissionDetailsInput & {
  id: string;
  congressSlug: string;
  draftOwnerEmail: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  submittedAt: string | null;
  presentationMode: PresentationMode | null;
  audience: AudienceType | null;
  file: {
    originalName: string;
    fileSize: number;
  } | null;
  authors: SubmissionAuthorInput[];
};

export type RegistrationAcceptedPaper = {
  submissionId: string;
  title: string;
  presentationMode: PresentationMode | null;
  audience: AudienceType | null;
  submittedAt: string | null;
  alreadyPaid: boolean;
  paidAt: string | null;
};

export type RegistrationConfig = {
  congressName: string;
  congressSlug: string;
  earlyDeadline: string | null;
  lateDeadline: string | null;
  currentPeriod: PaymentPeriod | null;
  bank: CongressBankInfo;
  gala: CongressGalaInfo;
  trip: CongressTripInfo;
  tiers: PaymentTierOption[];
};

export type RegistrationContext = {
  email: string;
  congressSlug: string;
  acceptedPapers: RegistrationAcceptedPaper[];
  config: RegistrationConfig;
};

export type RegistrationPaperSelectionInput = {
  submissionId: string;
  paperOrder: PaperOrder;
};

export type RegistrationDraft = {
  paperSubmissionIds: string[];
  listenerEnabled: boolean;
  listenerPresentationMode: PresentationMode | null;
  listenerAudience: AudienceType | null;
  galaAttendance: boolean;
  galaAttendeeCount: number;
  tripAttendance: boolean;
  tripAttendeeCount: number;
};

export type RegistrationLineItem = {
  key: string;
  label: string;
  amount: number;
  currency: string;
  detail?: string;
};

export type RegistrationQuote = {
  lines: RegistrationLineItem[];
  totalAmount: number;
  currency: string;
  paymentPeriod: PaymentPeriod | null;
  description: string;
  presenterName: string;
};

export type RegistrationSnapshot = {
  id: string;
  email: string;
  kind: RegistrationKind;
  totalAmount: number;
  currency: string;
  paymentPeriod: PaymentPeriod;
  paymentDescription: string;
  paidAt: string | null;
  paperItems: Array<{
    submissionId: string;
    title: string;
    paperOrder: PaperOrder;
    amount: number;
    currency: string;
  }>;
  listenerPresentationMode: PresentationMode | null;
  audience: AudienceType | null;
  galaAttendance: boolean;
  galaAttendeeCount: number;
  galaFeeAmount: number | null;
  galaFeeCurrency: string | null;
  tripAttendance: boolean;
  tripAttendeeCount: number;
  receipt: {
    originalName: string;
    fileSize: number;
    uploadedAt: string;
  } | null;
};
