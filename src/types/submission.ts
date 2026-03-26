export type SubmissionLanguage = "TR" | "EN";
export type PresentationMode = "ONLINE" | "IN_PERSON";

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
  authors: SubmissionAuthorInput[];
};
