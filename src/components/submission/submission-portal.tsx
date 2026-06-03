"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrencyAmount } from "@/lib/payment";
import { ACADEMIC_TITLES, OTHER_TITLE, academicTitleLabel } from "@/lib/titles";
import { useLocale, useT } from "@/lib/i18n/provider";
import type {
  AudienceType,
  PaymentTierOption,
  PresentationMode,
  SubmissionAuthorInput,
  SubmissionConfig,
  SubmissionDetailsInput,
  SubmissionSnapshot,
} from "@/types/submission";

type Props = {
  congressSlug: string;
  initialSnapshot: SubmissionSnapshot | null;
  config: SubmissionConfig;
};

type AuthorDraft = SubmissionAuthorInput & { localId: string; titleOther: boolean };

const KNOWN_TITLES: readonly string[] = ACADEMIC_TITLES.filter(
  (item) => item !== OTHER_TITLE,
);

type SubmissionDeclarations = {
  accuracy: boolean;
  submissionLimit: boolean;
  coauthorApproval: boolean;
  personalDataConsent: boolean;
  registrationPresentationConsent: boolean;
};

const emptyDetails: SubmissionDetailsInput = {
  submissionLanguage: "TR",
  titleTr: "",
  titleEn: "",
  abstractTr: "",
  abstractEn: "",
  keywordsTr: "",
  keywordsEn: "",
};

const emptyParticipation = {
  presentationMode: null as PresentationMode | null,
  audience: null as AudienceType | null,
};

const emptyAuthor = (): SubmissionAuthorInput => ({
  fullName: "",
  title: "",
  email: "",
  institution: "",
  country: "",
  isPresenter: false,
});

const emptyDeclarations: SubmissionDeclarations = {
  accuracy: false,
  submissionLimit: false,
  coauthorApproval: false,
  personalDataConsent: false,
  registrationPresentationConsent: false,
};

const DECLARATION_KEYS: (keyof SubmissionDeclarations)[] = [
  "accuracy",
  "submissionLimit",
  "coauthorApproval",
  "personalDataConsent",
  "registrationPresentationConsent",
];

function createAuthorDraft(author?: Partial<SubmissionAuthorInput>, isPresenter = false): AuthorDraft {
  const title = author?.title ?? "";
  return {
    localId: crypto.randomUUID(),
    fullName: author?.fullName ?? "",
    title,
    titleOther: title !== "" && !KNOWN_TITLES.includes(title),
    email: author?.email ?? "",
    institution: author?.institution ?? "",
    country: author?.country ?? "",
    isPresenter,
  };
}

function findPresenterPaperTiers(
  tiers: PaymentTierOption[],
  audience: AudienceType | null,
) {
  if (!audience) return [];
  return tiers.filter(
    (tier) =>
      tier.role === "PRESENTER" &&
      tier.presentationMode === null &&
      tier.audience === audience &&
      tier.paperOrder === 1,
  );
}

export function SubmissionPortal({ congressSlug, initialSnapshot, config }: Props) {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [snapshot, setSnapshot] = useState<SubmissionSnapshot | null>(initialSnapshot);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState(initialSnapshot?.draftOwnerEmail ?? "");
  const [draftLanguage, setDraftLanguage] = useState<"TR" | "EN">(
    initialSnapshot?.submissionLanguage ?? "TR",
  );
  const [draftMessage, setDraftMessage] = useState("");
  const [magicLinkPreview, setMagicLinkPreview] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [declarations, setDeclarations] = useState<SubmissionDeclarations>(emptyDeclarations);

  const [details, setDetails] = useState<SubmissionDetailsInput>(
    initialSnapshot
      ? {
          submissionLanguage: initialSnapshot.submissionLanguage,
          titleTr: initialSnapshot.titleTr,
          titleEn: initialSnapshot.titleEn,
          abstractTr: initialSnapshot.abstractTr,
          abstractEn: initialSnapshot.abstractEn,
          keywordsTr: initialSnapshot.keywordsTr,
          keywordsEn: initialSnapshot.keywordsEn,
        }
      : emptyDetails,
  );

  const [participation, setParticipation] = useState<typeof emptyParticipation>(
    initialSnapshot
      ? {
          presentationMode: initialSnapshot.presentationMode,
          audience: initialSnapshot.audience,
        }
      : emptyParticipation,
  );

  const [authors, setAuthors] = useState<AuthorDraft[]>(
    initialSnapshot?.authors.length
      ? initialSnapshot.authors.map((author) => createAuthorDraft(author, author.isPresenter))
      : [createAuthorDraft(emptyAuthor(), true)],
  );

  // Sunan yazarın e-postası, taslağı başlatan e-posta ile aynı olmalı: boşsa otomatik doldur.
  useEffect(() => {
    const ownerEmail = snapshot?.draftOwnerEmail;
    if (!ownerEmail) return;
    setAuthors((current) => {
      if (!current.some((author) => author.isPresenter && !author.email.trim())) return current;
      return current.map((author) =>
        author.isPresenter && !author.email.trim() ? { ...author, email: ownerEmail } : author,
      );
    });
  }, [snapshot?.draftOwnerEmail]);

  const activeStep = snapshot ? step : 0;
  const hasExistingFile = Boolean(snapshot?.file);
  const areDeclarationsComplete = Object.values(declarations).every(Boolean);
  const selectedLanguageLabel = useMemo(
    () => (details.submissionLanguage === "TR" ? t("submission.turkce") : t("submission.ingilizce")),
    [details.submissionLanguage, t],
  );

  const presenterPaperTiers = useMemo(
    () => findPresenterPaperTiers(config.tiers, participation.audience),
    [config.tiers, participation.audience],
  );

  const earlyTier = presenterPaperTiers.find((tier) => tier.period === "EARLY");
  const lateTier = presenterPaperTiers.find((tier) => tier.period === "LATE");

  async function readResponsePayload(response: Response) {
    const text = await response.text();
    if (!text) return {} as Record<string, unknown>;
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(t("errors.serverNoResponse"));
    }
  }

  async function startDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setDraftMessage("");
    setMagicLinkPreview("");

    try {
      const response = await fetch("/api/submissions/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ congressSlug, email, submissionLanguage: draftLanguage }),
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? t("submission.err.draftCreateFailed"));
      }

      setDraftMessage((data.message as string | undefined) ?? "");
      setDetails((current) => ({ ...current, submissionLanguage: draftLanguage }));
      if (data.magicLinkPreview) setMagicLinkPreview(data.magicLinkPreview as string);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? t("submission.err.detailsSaveFailed"));
      }

      let nextSubmission = (data.submission as SubmissionSnapshot | undefined) ?? null;

      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        const fileResponse = await fetch(`/api/submissions/${snapshot.id}/file`, {
          method: "PUT",
          body: formData,
        });
        const fileData = await readResponsePayload(fileResponse);
        if (!fileResponse.ok) {
          throw new Error((fileData.error as string | undefined) ?? t("submission.err.fileUploadFailed"));
        }
        nextSubmission = (fileData.submission as SubmissionSnapshot | undefined) ?? nextSubmission;
      }

      setSnapshot(nextSubmission);
      setStep(2);
      setFile(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  async function saveAuthors(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;

    const presenter = authors.find((author) => author.isPresenter);
    if (
      presenter &&
      presenter.email.trim().toLowerCase() !== snapshot.draftOwnerEmail.trim().toLowerCase()
    ) {
      setError(t("api.presenterEmailMismatch"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/authors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authors: authors.map((author) => ({
            fullName: author.fullName,
            title: author.title,
            email: author.email,
            institution: author.institution,
            country: author.country,
            isPresenter: author.isPresenter,
          })),
        }),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? t("submission.err.authorsSaveFailed"));
      }
      setSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
      setStep(3);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  async function saveParticipation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;
    if (!participation.presentationMode || !participation.audience) {
      setError(t("submission.err.participationRequired"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/participation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presentationMode: participation.presentationMode,
          audience: participation.audience,
        }),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? t("submission.err.participationSaveFailed"));
      }
      setSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
      setStep(4);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  async function submitFinal() {
    if (!snapshot) return;
    if (!areDeclarationsComplete) {
      setError(t("submission.err.declarations"));
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declarations }),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? t("submission.err.submitFailed"));
      }
      router.push(`/${congressSlug}/bildiri-gonder/basarili?id=${snapshot.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  function updateAuthor(index: number, patch: Partial<AuthorDraft>) {
    setAuthors((current) =>
      current.map((author, authorIndex) =>
        authorIndex === index
          ? { ...author, ...patch }
          : patch.isPresenter
            ? { ...author, isPresenter: false }
            : author,
      ),
    );
  }

  function addAuthor() {
    setAuthors((current) => [...current, createAuthorDraft(emptyAuthor(), false)]);
  }

  function removeAuthor(index: number) {
    setAuthors((current) => {
      const next = current.filter((_, currentIndex) => currentIndex !== index);
      if (!next.some((author) => author.isPresenter) && next[0]) {
        next[0].isPresenter = true;
      }
      return next.length ? next : [createAuthorDraft(emptyAuthor(), true)];
    });
  }

  if (!snapshot) {
    return (
      <div className="card start-card">
        <h2 className="section-title">{t("submission.startDraftTitle")}</h2>
        <p className="flow-intro">{t("submission.startDraftIntro")}</p>
        <div className="notice" style={{ marginBottom: 18 }}>
          {t("submission.secondPaperNotice")}
        </div>
        <form className="submission-form-panel" onSubmit={startDraft}>
          <div className="grid two">
            <div className="field">
              <label htmlFor="draft-email">
                {t("common.email")} <span className="required">*</span>
              </label>
              <input
                id="draft-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("submission.emailPlaceholder")}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="draft-language">
                {t("submission.paperLanguageLabel")} <span className="required">*</span>
              </label>
              <select
                id="draft-language"
                value={draftLanguage}
                onChange={(event) => {
                  const nextLanguage = event.target.value as "TR" | "EN";
                  setDraftLanguage(nextLanguage);
                  setDetails((current) => ({ ...current, submissionLanguage: nextLanguage }));
                }}
              >
                <option value="TR">{t("submission.turkce")}</option>
                <option value="EN">{t("submission.ingilizce")}</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <div>
              {draftMessage ? <div className="notice">{draftMessage}</div> : null}
              {magicLinkPreview ? (
                <div className="magic-preview">
                  <strong>{t("submission.previewTitle")}</strong>
                  <p style={{ margin: "10px 0 14px", color: "#284777" }}>
                    {t("submission.previewDesc")}
                  </p>
                  <a className="button primary" href={magicLinkPreview} style={{ display: "inline-flex" }}>
                    {t("submission.openDraft")}
                  </a>
                </div>
              ) : null}
              {error ? <div className="error">{error}</div> : null}
            </div>
            <button className="button primary" disabled={loading} type="submit">
              {loading ? t("submission.preparing") : t("submission.startDraftButton")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="steps">
        {[1, 2, 3, 4].map((item) => (
          <div className={`step ${activeStep === item ? "active" : activeStep > item ? "done" : ""}`} key={item}>
            <span className="step-badge">{item}</span>
            <span>{t(`submission.step${item}`)}</span>
            {item < 4 ? <span className="step-separator">→</span> : null}
          </div>
        ))}
      </div>

      <div className="card wizard-card">
        <h2 className="section-title">{t(`submission.step${step}`)}</h2>

        {step === 1 ? (
          <form className="submission-form-panel" onSubmit={saveDetails}>
            <div className="field-row" style={{ marginBottom: 18 }}>
              <span className="pill">{t("submission.paperLangPill", { lang: selectedLanguageLabel })}</span>
              <span className="pill" style={{ background: "#eef4fb" }}>
                {t("submission.draftOwnerPill", { email: snapshot.draftOwnerEmail })}
              </span>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label htmlFor="file">
                {t("submission.mainFile")} {!hasExistingFile ? <span className="required">*</span> : null}
              </label>
              <input
                id="file"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span className="field-hint">
                {t("submission.fileHint")}
                {snapshot.file ? t("submission.existingFile", { name: snapshot.file.originalName }) : ""}
              </span>
            </div>

            <div className="form-stack">
              {details.submissionLanguage === "TR" ? (
                <>
                  <div className="field">
                    <label htmlFor="title-tr">
                      {t("submission.titleTrLabel")} <span className="required">*</span>
                    </label>
                    <input
                      id="title-tr"
                      value={details.titleTr}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, titleTr: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="abstract-tr">
                      {t("submission.abstractTrLabel")} <span className="required">*</span>
                    </label>
                    <textarea
                      id="abstract-tr"
                      value={details.abstractTr}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, abstractTr: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="keywords-tr">
                      {t("submission.keywordsTrLabel")} <span className="required">*</span>
                    </label>
                    <input
                      id="keywords-tr"
                      value={details.keywordsTr}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, keywordsTr: event.target.value }))
                      }
                      placeholder={t("submission.keywordsPlaceholder")}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="title-en">
                      {t("submission.titleEnLabel")} <span className="required">*</span>
                    </label>
                    <input
                      id="title-en"
                      value={details.titleEn}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, titleEn: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="abstract-en">
                      {t("submission.abstractEnLabel")} <span className="required">*</span>
                    </label>
                    <textarea
                      id="abstract-en"
                      value={details.abstractEn}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, abstractEn: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="keywords-en">
                      {t("submission.keywordsEnLabel")} <span className="required">*</span>
                    </label>
                    <input
                      id="keywords-en"
                      value={details.keywordsEn}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, keywordsEn: event.target.value }))
                      }
                      placeholder={t("submission.keywordsPlaceholder")}
                    />
                  </div>
                </>
              )}
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <span />
              <button className="button primary" disabled={loading} type="submit">
                {loading ? t("common.saving") : t("submission.next")}
              </button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="submission-form-panel" onSubmit={saveAuthors}>
            <div className="notice" style={{ marginBottom: 16 }}>
              {t("submission.presenterEmailHint", { email: snapshot.draftOwnerEmail })}
            </div>
            <div className="grid" style={{ gap: 16 }}>
              {authors.map((author, index) => (
                <div className="author-card" key={author.localId}>
                  <div className="author-head">
                    <strong>{t("submission.authorN", { n: index + 1 })}</strong>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <label className="radio-line">
                        <input
                          checked={author.isPresenter}
                          name="presenter"
                          onChange={() => updateAuthor(index, { isPresenter: true })}
                          type="radio"
                        />
                        {t("submission.presenterRadio")}
                      </label>
                      {authors.length > 1 ? (
                        <button
                          className="button ghost"
                          onClick={() => removeAuthor(index)}
                          type="button"
                        >
                          {t("submission.delete")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid two">
                    <div className="field">
                      <label>
                        {t("submission.fullNameLabel")} <span className="required">*</span>
                      </label>
                      <input
                        value={author.fullName}
                        onChange={(event) => updateAuthor(index, { fullName: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>
                        {t("registration.titleLabel")} <span className="required">*</span>
                      </label>
                      <select
                        value={author.titleOther ? OTHER_TITLE : author.title}
                        onChange={(event) => {
                          const value = event.target.value;
                          if (value === OTHER_TITLE) {
                            updateAuthor(index, { titleOther: true, title: "" });
                          } else {
                            updateAuthor(index, { titleOther: false, title: value });
                          }
                        }}
                      >
                        <option value="">{t("common.select")}</option>
                        {ACADEMIC_TITLES.map((option) => (
                          <option key={option} value={option}>
                            {academicTitleLabel(option, locale)}
                          </option>
                        ))}
                      </select>
                      {author.titleOther ? (
                        <input
                          style={{ marginTop: 8 }}
                          placeholder={t("registration.titleOtherPlaceholder")}
                          value={author.title}
                          onChange={(event) => updateAuthor(index, { title: event.target.value })}
                        />
                      ) : null}
                    </div>
                    <div className="field">
                      <label>
                        {t("common.email")} <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        value={author.email}
                        onChange={(event) => updateAuthor(index, { email: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>{t("submission.institutionLabel")}</label>
                      <input
                        value={author.institution}
                        onChange={(event) => updateAuthor(index, { institution: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>{t("submission.countryLabel")}</label>
                      <input
                        value={author.country}
                        onChange={(event) => updateAuthor(index, { country: event.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <button className="button secondary" onClick={addAuthor} type="button">
                {t("submission.addAuthor")}
              </button>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(1)} type="button">
                {t("common.back")}
              </button>
              <button className="button primary" disabled={loading} type="submit">
                {loading ? t("common.saving") : t("submission.next")}
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form className="submission-form-panel" onSubmit={saveParticipation}>
            <div className="field" style={{ marginBottom: 22 }}>
              <label>
                {t("submission.presentationModeLabel")} <span className="required">*</span>
              </label>
              <div className="option-cards">
                <label
                  className={`option-card${participation.presentationMode === "IN_PERSON" ? " is-selected" : ""}`}
                >
                  <input
                    checked={participation.presentationMode === "IN_PERSON"}
                    name="presentation-mode"
                    onChange={() => setParticipation((current) => ({ ...current, presentationMode: "IN_PERSON" }))}
                    type="radio"
                  />
                  <span className="option-card-title">{t("quote.inPerson")}</span>
                  <span className="option-card-meta">{t("submission.inPersonMeta")}</span>
                </label>
                <label
                  className={`option-card${participation.presentationMode === "ONLINE" ? " is-selected" : ""}`}
                >
                  <input
                    checked={participation.presentationMode === "ONLINE"}
                    name="presentation-mode"
                    onChange={() => setParticipation((current) => ({ ...current, presentationMode: "ONLINE" }))}
                    type="radio"
                  />
                  <span className="option-card-title">{t("quote.online")}</span>
                  <span className="option-card-meta">{t("submission.onlineMeta")}</span>
                </label>
              </div>
              <span className="field-hint">{t("submission.sameFeeHint")}</span>
            </div>

            <div className="field" style={{ marginBottom: 22 }}>
              <label>
                {t("submission.academicStatusLabel")} <span className="required">*</span>
              </label>
              <div className="option-cards">
                <label
                  className={`option-card${participation.audience === "ACADEMIC" ? " is-selected" : ""}`}
                >
                  <input
                    checked={participation.audience === "ACADEMIC"}
                    name="audience"
                    onChange={() => setParticipation((current) => ({ ...current, audience: "ACADEMIC" }))}
                    type="radio"
                  />
                  <span className="option-card-title">{t("quote.academic")}</span>
                  <span className="option-card-meta">{t("submission.academicMeta")}</span>
                </label>
                <label
                  className={`option-card${participation.audience === "STUDENT" ? " is-selected" : ""}`}
                >
                  <input
                    checked={participation.audience === "STUDENT"}
                    name="audience"
                    onChange={() => setParticipation((current) => ({ ...current, audience: "STUDENT" }))}
                    type="radio"
                  />
                  <span className="option-card-title">{t("quote.student")}</span>
                  <span className="option-card-meta">{t("submission.studentMeta")}</span>
                </label>
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(2)} type="button">
                {t("common.back")}
              </button>
              <button className="button primary" disabled={loading} type="submit">
                {loading ? t("common.saving") : t("submission.next")}
              </button>
            </div>
          </form>
        ) : null}

        {step === 4 ? (
          <div className="submission-form-panel">
            <div className="grid two" style={{ marginBottom: 22 }}>
              <div className="author-card">
                <h3>{t("submission.paperFeeHeading")}</h3>
                {participation.audience ? (
                  <div className="form-stack">
                    <div className="field">
                      <label>{t("submission.category")}</label>
                      <div className="field-display">
                        {participation.audience === "ACADEMIC" ? t("quote.academic") : t("quote.student")}
                      </div>
                    </div>
                    <div className="field">
                      <label>{t("quote.periodEarly")}</label>
                      <div className="amount-display">
                        {earlyTier
                          ? formatCurrencyAmount(earlyTier.amount, earlyTier.currency, locale)
                          : t("submission.notDefined")}
                        <span className="amount-display-meta">{t("submission.forFirstPaper")}</span>
                      </div>
                    </div>
                    <div className="field">
                      <label>{t("quote.periodLate")}</label>
                      <div className="amount-display">
                        {lateTier
                          ? formatCurrencyAmount(lateTier.amount, lateTier.currency, locale)
                          : t("submission.notDefined")}
                        <span className="amount-display-meta">{t("submission.forFirstPaper")}</span>
                      </div>
                    </div>
                    <span className="field-hint">{t("submission.feeHint")}</span>
                  </div>
                ) : (
                  <p style={{ margin: 0, color: "#617089" }}>{t("submission.noAudience")}</p>
                )}
              </div>

              <div className="author-card">
                <h3>{t("submission.paymentInfoHeading")}</h3>
                <div className="form-stack">
                  <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    {t("submission.paymentInfo1")}
                  </p>
                  <p style={{ margin: 0, color: "var(--text-muted)", lineHeight: 1.55 }}>
                    {t("submission.paymentInfo2")}
                  </p>
                </div>
              </div>
            </div>

            <div className="author-card" style={{ marginBottom: 22 }}>
              <h3>{t("registration.ethicsHeading")}</h3>
              <div className="checklist">
                {DECLARATION_KEYS.map((key) => (
                  <label className="check-item" key={key}>
                    <input
                      checked={declarations[key]}
                      onChange={(event) =>
                        setDeclarations((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      type="checkbox"
                    />
                    <span>{t(`registration.decl.${key}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(3)} type="button">
                {t("common.back")}
              </button>
              <button
                className="button primary"
                disabled={loading || !areDeclarationsComplete}
                onClick={submitFinal}
                type="button"
              >
                {loading ? t("common.sending") : t("submission.submitPaper")}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
