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
