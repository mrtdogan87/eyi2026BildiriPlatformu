export type AdminSubmissionListItem = {
  id: string;
  title: string;
  presenterName: string;
  presenterEmail: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  statusLabel: string;
  submissionLanguage: "TR" | "EN";
  presentationMode: string;
  galaLabel: string;
  tripLabel: string;
  submittedAt: string | null;
  paymentLabel: string;
  paymentAmountLabel: string;
};

export type AdminSubmissionListFilters = {
  q: string;
  status: "ALL" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  language: "ALL" | "TR" | "EN";
  presentationMode: "ALL" | "ONLINE" | "IN_PERSON";
  gala: "ALL" | "YES" | "NO";
  trip: "ALL" | "YES" | "NO";
};

export type AdminSubmissionDetail = {
  id: string;
  draftOwnerEmail: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  statusLabel: string;
  submissionLanguage: "TR" | "EN";
  titleTr: string;
  titleEn: string;
  abstractTr: string;
  abstractEn: string;
  keywordsTr: string;
  keywordsEn: string;
  presentationMode: string;
  galaAttendance: boolean;
  galaAttendeeCount: number;
  tripAttendance: boolean;
  tripAttendeeCount: number;
  submittedAt: string | null;
  payment: {
    tierLabel: string;
    periodLabel: string;
    audienceLabel: string;
    roleLabel: string;
    amount: number | null;
    currency: string | null;
    amountLabel: string;
    galaAmountLabel: string;
    description: string;
  };
  authors: Array<{
    id: string;
    fullName: string;
    email: string;
    institution: string;
    country: string;
    isPresenter: boolean;
  }>;
  file: {
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    previewText: string | null;
  } | null;
  paymentReceipt: {
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  } | null;
  statusHistory: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string;
    changedAt: string;
  }>;
};

export type AdminPaymentTier = {
  id: string;
  presentationMode: "ONLINE" | "IN_PERSON";
  role: "PRESENTER" | "LISTENER";
  audience: "ACADEMIC" | "STUDENT" | null;
  onlinePaperCount: 1 | 2 | null;
  period: "EARLY" | "LATE" | null;
  amount: number;
  currency: string;
  active: boolean;
  sortOrder: number;
  label: string;
};

export type AdminCongressSettings = {
  slug: string;
  name: string;
  earlyDeadline: string | null;
  lateDeadline: string | null;
  galaFeeAmount: number;
  galaFeeCurrency: string;
  galaFeeNote: string;
  bankName: string;
  bankAccountHolder: string;
  bankIban: string;
  bankBranch: string;
  tripNote: string;
};

export type AdminPricingPayload = {
  congress: AdminCongressSettings;
  tiers: AdminPaymentTier[];
  currentPeriod: "EARLY" | "LATE" | null;
};
