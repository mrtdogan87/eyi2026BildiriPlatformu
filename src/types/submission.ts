export type SubmissionLanguage = "TR" | "EN";
export type PresentationMode = "ONLINE" | "IN_PERSON";
export type InPersonCategory = "ACADEMIC" | "STUDENT";
export type PaymentCategory = "ACADEMIC" | "STUDENT" | "ONLINE_ONE" | "ONLINE_TWO";
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
  inPersonCategory: InPersonCategory | null;
  onlinePaperCount: OnlinePaperCount | null;
};

export type SubmissionPaymentSummary = SubmissionPaymentInput & {
  category: PaymentCategory | null;
  period: PaymentPeriod | null;
  amount: number | null;
  description: string;
  isClosed: boolean;
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
