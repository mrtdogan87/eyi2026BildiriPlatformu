export type AdminSubmissionListItem = {
  id: string;
  title: string;
  presenterName: string;
  presenterEmail: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  statusLabel: string;
  submissionLanguage: "TR" | "EN";
  presentationMode: string;
  audienceLabel: string;
  registrationStatusLabel: string;
  submittedAt: string | null;
};

export type AdminSubmissionListFilters = {
  q: string;
  status: "ALL" | "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
  language: "ALL" | "TR" | "EN";
  presentationMode: "ALL" | "ONLINE" | "IN_PERSON";
  registration: "ALL" | "PAID" | "PENDING";
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
  audienceLabel: string;
  submittedAt: string | null;
  registration: {
    id: string;
    paidAt: string | null;
    amount: number;
    currency: string;
    amountLabel: string;
    description: string;
    paperOrder: 1 | 2 | null;
  } | null;
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
  presentationMode: "ONLINE" | "IN_PERSON" | null;
  role: "PRESENTER" | "LISTENER";
  audience: "ACADEMIC" | "STUDENT" | null;
  paperOrder: 1 | 2 | null;
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

export type AdminRegistrationListItem = {
  id: string;
  email: string;
  kindLabel: string;
  paperCount: number;
  totalAmountLabel: string;
  paymentPeriodLabel: string;
  paidAt: string | null;
  createdAt: string;
};

export type AdminRegistrationListFilters = {
  q: string;
  kind: "ALL" | "PAPERS" | "LISTENER";
  status: "ALL" | "PAID" | "PENDING";
  period: "ALL" | "EARLY" | "LATE";
};

export type AdminRegistrationDetail = {
  id: string;
  email: string;
  kind: "PAPERS" | "LISTENER";
  kindLabel: string;
  audienceLabel: string;
  listenerPresentationModeLabel: string;
  listenerDaysLabel: string;
  paymentDescription: string;
  paymentPeriod: "EARLY" | "LATE";
  paymentPeriodLabel: string;
  totalAmount: number;
  currency: string;
  totalAmountLabel: string;
  galaAttendance: boolean;
  galaAttendeeCount: number;
  galaAmountLabel: string;
  tripAttendance: boolean;
  tripAttendeeCount: number;
  paidAt: string | null;
  createdAt: string;
  receipt: {
    originalName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  } | null;
  paperItems: Array<{
    submissionId: string;
    title: string;
    paperOrder: 1 | 2;
    amount: number;
    currency: string;
    amountLabel: string;
  }>;
};
