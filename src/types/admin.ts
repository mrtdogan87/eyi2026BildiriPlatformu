export type AdminSubmissionListItem = {
  id: string;
  title: string;
  presenterName: string;
  presenterEmail: string;
  submissionLanguage: "TR" | "EN";
  presentationMode: string;
  galaLabel: string;
  tripLabel: string;
  submittedAt: string | null;
};

export type AdminSubmissionListFilters = {
  q: string;
  language: "ALL" | "TR" | "EN";
  presentationMode: "ALL" | "ONLINE" | "IN_PERSON";
  gala: "ALL" | "YES" | "NO";
  trip: "ALL" | "YES" | "NO";
};

export type AdminSubmissionDetail = {
  id: string;
  draftOwnerEmail: string;
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
  } | null;
};
