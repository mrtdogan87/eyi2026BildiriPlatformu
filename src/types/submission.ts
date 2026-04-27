export type SubmissionLanguage = "TR" | "EN";
export type PresentationMode = "ONLINE" | "IN_PERSON";
export type AudienceType = "ACADEMIC" | "STUDENT";
export type AttendeeRole = "PRESENTER" | "LISTENER";
export type PaymentPeriod = "EARLY" | "LATE";
export type OnlinePaperCount = 1 | 2;

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
  galaAttendance: boolean;
  galaAttendeeCount: number;
  tripAttendance: boolean;
  tripAttendeeCount: number;
};

export type SubmissionPaymentInput = {
  attendeeRole: AttendeeRole | null;
  audience: AudienceType | null;
  onlinePaperCount: OnlinePaperCount | null;
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
  presentationMode: PresentationMode;
  role: AttendeeRole;
  audience: AudienceType | null;
  onlinePaperCount: OnlinePaperCount | null;
  period: PaymentPeriod | null;
  amount: number;
  currency: string;
  label: string;
};

export type SubmissionPaymentSummary = SubmissionPaymentInput & {
  attendeeRole: AttendeeRole | null;
  audience: AudienceType | null;
  onlinePaperCount: OnlinePaperCount | null;
  period: PaymentPeriod | null;
  amount: number | null;
  currency: string | null;
  description: string;
  isClosed: boolean;
  galaAmount: number | null;
  galaCurrency: string | null;
  tierId: string | null;
};

export type SubmissionConfig = {
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

export type SubmissionSnapshot = SubmissionDetailsInput &
  SubmissionParticipationInput & {
    id: string;
    congressSlug: string;
    draftOwnerEmail: string;
    status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
    submittedAt: string | null;
    file: {
      originalName: string;
      fileSize: number;
    } | null;
    payment: SubmissionPaymentSummary;
    paymentReceipt: {
      originalName: string;
      fileSize: number;
      uploadedAt: string;
    } | null;
    authors: SubmissionAuthorInput[];
  };
