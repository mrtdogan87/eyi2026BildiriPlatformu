"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mapAttendeeRole, mapAudience, mapPaymentPeriod } from "@/lib/payment";
import type {
  AttendeeRole,
  AudienceType,
  OnlinePaperCount,
  PaymentTierOption,
  SubmissionAuthorInput,
  SubmissionConfig,
  SubmissionDetailsInput,
  SubmissionParticipationInput,
  SubmissionPaymentInput,
  SubmissionSnapshot,
} from "@/types/submission";

type Props = {
  congressSlug: string;
  initialSnapshot: SubmissionSnapshot | null;
  config: SubmissionConfig;
};

type AuthorDraft = SubmissionAuthorInput & {
  localId: string;
};

type SubmissionDeclarations = {
  accuracy: boolean;
  originality: boolean;
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

const emptyParticipation: SubmissionParticipationInput = {
  presentationMode: "IN_PERSON",
  galaAttendance: false,
  galaAttendeeCount: 0,
  tripAttendance: false,
  tripAttendeeCount: 0,
};

const emptyPayment: SubmissionPaymentInput = {
  attendeeRole: null,
  audience: null,
  onlinePaperCount: null,
};

const emptyAuthor = (): SubmissionAuthorInput => ({
  fullName: "",
  email: "",
  institution: "",
  country: "",
  isPresenter: false,
});

const emptyDeclarations: SubmissionDeclarations = {
  accuracy: false,
  originality: false,
  submissionLimit: false,
  coauthorApproval: false,
  personalDataConsent: false,
  registrationPresentationConsent: false,
};

const declarationLabels: Record<keyof SubmissionDeclarations, string> = {
  accuracy:
    "Başvuru sahibi olarak, bu form kapsamında tarafımdan sunulan tüm bilgi ve belgelerin doğru, eksiksiz ve güncel olduğunu beyan ederim.",
  originality:
    "Başvurusu yapılan çalışmanın özgün olduğunu, intihal içermediğini ve aynı anda başka bir kongre, sempozyum ya da yayın organında değerlendirme sürecinde bulunmadığını kabul ederim.",
  submissionLimit:
    "Kongre kapsamında geçerli olan, bir araştırmacının en fazla iki bildiride yazar olarak yer alabileceği kuralını okuduğumu, anladığımı ve kabul ettiğimi beyan ederim.",
  coauthorApproval:
    "Başvurusu yapılan çalışmada adı geçen diğer yazarların çalışmadan, başvuru sürecinden ve bildiri içeriğinden haberdar olduğunu; tüm ortak yazarlardan gerekli izin ve onayın tarafımca alındığını beyan ederim.",
  personalDataConsent:
    "Kongre başvuru, değerlendirme, program oluşturma, sertifika düzenleme ve ilgili akademik/idari süreçlerin yürütülmesi amacıyla kişisel verilerimin işlenmesine onay verdiğimi kabul ederim.",
  registrationPresentationConsent:
    "Bildiri kabul edilse dahi, kongre kurallarında belirtilen kayıt ve sunum yükümlülüklerinin yerine getirilmemesi durumunda çalışmanın programa alınmayabileceğini veya yayımlanmayabileceğini kabul ederim.",
};

function createAuthorDraft(author?: Partial<SubmissionAuthorInput>, isPresenter = false): AuthorDraft {
  return {
    localId: crypto.randomUUID(),
    fullName: author?.fullName ?? "",
    email: author?.email ?? "",
    institution: author?.institution ?? "",
    country: author?.country ?? "",
    isPresenter: isPresenter,
  };
}

function formatCurrency(amount: number | null, currency: string | null) {
  if (amount == null || !currency) {
    return "Henüz hesaplanmadı";
  }

  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function findMatchingTier(
  tiers: PaymentTierOption[],
  selection: {
    presentationMode: "IN_PERSON" | "ONLINE";
    attendeeRole: AttendeeRole | null;
    audience: AudienceType | null;
    onlinePaperCount: OnlinePaperCount | null;
    period: "EARLY" | "LATE" | null;
  },
): PaymentTierOption | null {
  if (!selection.attendeeRole) return null;

  return (
    tiers.find((tier) => {
      if (tier.presentationMode !== selection.presentationMode) return false;
      if (tier.role !== selection.attendeeRole) return false;

      if (selection.presentationMode === "IN_PERSON") {
        if (tier.audience !== selection.audience) return false;
        if (selection.period !== null && tier.period !== selection.period) return false;
        if (selection.period === null && tier.period !== null) return false;
        return true;
      }

      if (tier.audience !== null) return false;
      if (tier.period !== null) return false;
      if (selection.attendeeRole === "PRESENTER") {
        return tier.onlinePaperCount === selection.onlinePaperCount;
      }
      return tier.onlinePaperCount === null;
    }) ?? null
  );
}

export function SubmissionPortal({ congressSlug, initialSnapshot, config }: Props) {
  const router = useRouter();
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
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
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
  const [participation, setParticipation] = useState<SubmissionParticipationInput>(
    initialSnapshot
      ? {
          presentationMode: initialSnapshot.presentationMode,
          galaAttendance: initialSnapshot.galaAttendance,
          galaAttendeeCount: initialSnapshot.galaAttendeeCount,
          tripAttendance: initialSnapshot.tripAttendance,
          tripAttendeeCount: initialSnapshot.tripAttendeeCount,
        }
      : emptyParticipation,
  );
  const [payment, setPayment] = useState<SubmissionPaymentInput>(
    initialSnapshot
      ? {
          attendeeRole: initialSnapshot.payment.attendeeRole,
          audience: initialSnapshot.payment.audience,
          onlinePaperCount: initialSnapshot.payment.onlinePaperCount,
        }
      : emptyPayment,
  );
  const [authors, setAuthors] = useState<AuthorDraft[]>(
    initialSnapshot?.authors.length
      ? initialSnapshot.authors.map((author) => createAuthorDraft(author, author.isPresenter))
      : [createAuthorDraft(emptyAuthor(), true)],
  );

  const activeStep = snapshot ? step : 0;
  const hasExistingFile = Boolean(snapshot?.file);
  const hasExistingReceipt = Boolean(snapshot?.paymentReceipt);
  const areDeclarationsComplete = Object.values(declarations).every(Boolean);
  const isPaymentClosed = snapshot?.payment.isClosed ?? false;

  const selectedLanguageLabel = useMemo(
    () => (details.submissionLanguage === "TR" ? "Türkçe" : "İngilizce"),
    [details.submissionLanguage],
  );
  const presenterName = useMemo(() => {
    const presenter = authors.find((author) => author.isPresenter) ?? authors[0];
    return presenter?.fullName.trim() ?? "";
  }, [authors]);

  const matchedTier = useMemo(
    () =>
      findMatchingTier(config.tiers, {
        presentationMode: participation.presentationMode,
        attendeeRole: payment.attendeeRole,
        audience: payment.audience,
        onlinePaperCount: payment.onlinePaperCount,
        period: participation.presentationMode === "IN_PERSON" ? config.currentPeriod : null,
      }),
    [config.tiers, config.currentPeriod, participation.presentationMode, payment],
  );

  const requiresReceipt = (matchedTier?.amount ?? 0) > 0;

  useEffect(() => {
    if (participation.presentationMode === "ONLINE") {
      setPayment((current) => {
        if (!current.attendeeRole && !current.audience && !current.onlinePaperCount) {
          return current;
        }
        return {
          attendeeRole: current.attendeeRole,
          audience: null,
          onlinePaperCount: current.attendeeRole === "PRESENTER" ? current.onlinePaperCount : null,
        };
      });
    } else {
      setPayment((current) => ({
        attendeeRole: current.attendeeRole,
        audience: current.audience,
        onlinePaperCount: null,
      }));
    }
  }, [participation.presentationMode]);

  function applySubmissionSnapshot(nextSubmission: SubmissionSnapshot | null) {
    setSnapshot(nextSubmission);
    if (nextSubmission) {
      setPayment({
        attendeeRole: nextSubmission.payment.attendeeRole,
        audience: nextSubmission.payment.audience,
        onlinePaperCount: nextSubmission.payment.onlinePaperCount,
      });
    }
  }

  async function readResponsePayload(response: Response) {
    const text = await response.text();
    if (!text) {
      return {} as Record<string, unknown>;
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error("Sunucudan beklenen yanıt alınamadı. Lütfen sayfayı yenileyip tekrar deneyin.");
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          congressSlug,
          email,
          submissionLanguage: draftLanguage,
        }),
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? "Taslak oluşturulamadı.");
      }

      setDraftMessage((data.message as string | undefined) ?? "");
      setDetails((current) => ({
        ...current,
        submissionLanguage: draftLanguage,
      }));
      if (data.magicLinkPreview) {
        setMagicLinkPreview(data.magicLinkPreview as string);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
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
        throw new Error((data.error as string | undefined) ?? "Bildiri bilgileri kaydedilemedi.");
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
          throw new Error((fileData.error as string | undefined) ?? "Dosya yüklenemedi.");
        }

        nextSubmission = (fileData.submission as SubmissionSnapshot | undefined) ?? nextSubmission;
      }

      applySubmissionSnapshot(nextSubmission);
      setStep(2);
      setFile(null);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAuthors(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/authors`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authors: authors.map((author) => ({
            fullName: author.fullName,
            email: author.email,
            institution: author.institution,
            country: author.country,
            isPresenter: author.isPresenter,
          })),
        }),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? "Yazar bilgileri kaydedilemedi.");
      }

      applySubmissionSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
      setStep(3);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function saveParticipation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/participation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(participation),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? "Katılım bilgileri kaydedilemedi.");
      }

      applySubmissionSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
      setReceiptFile(null);
      setStep(4);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/submissions/${snapshot.id}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? "Ücret bilgileri kaydedilemedi.");
      }

      let nextSubmission = (data.submission as SubmissionSnapshot | undefined) ?? null;
      applySubmissionSnapshot(nextSubmission);

      const requiresReceiptUpload = (nextSubmission?.payment.amount ?? 0) > 0;

      if (receiptFile) {
        if (!requiresReceiptUpload) {
          throw new Error("Bu kategori için dekont gerekmediğinden dekont yüklenemez.");
        }

        const formData = new FormData();
        formData.append("file", receiptFile);

        const receiptResponse = await fetch(`/api/submissions/${snapshot.id}/payment-receipt`, {
          method: "PUT",
          body: formData,
        });
        const receiptData = await readResponsePayload(receiptResponse);
        if (!receiptResponse.ok) {
          throw new Error((receiptData.error as string | undefined) ?? "Dekont yüklenemedi.");
        }

        nextSubmission = (receiptData.submission as SubmissionSnapshot | undefined) ?? nextSubmission;
        applySubmissionSnapshot(nextSubmission);
      }

      if (requiresReceiptUpload && !nextSubmission?.paymentReceipt) {
        throw new Error("Sonraki adıma geçebilmek için ödeme dekontunu yüklemelisiniz.");
      }

      setReceiptFile(null);
      setStep(5);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function submitFinal() {
    if (!snapshot) return;
    if (!areDeclarationsComplete) {
      setError("Bildirinizi gönderebilmek için tüm beyanları onaylamalısınız.");
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
        throw new Error((data.error as string | undefined) ?? "Bildiri gönderilemedi.");
      }

      router.push(`/${congressSlug}/bildiri-gonder/basarili?id=${snapshot.id}`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
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

  function updateParticipationMode(mode: "ONLINE" | "IN_PERSON") {
    setParticipation((current) => ({
      ...current,
      presentationMode: mode,
      galaAttendance: mode === "ONLINE" ? false : current.galaAttendance,
      galaAttendeeCount: mode === "ONLINE" ? 0 : current.galaAttendeeCount,
      tripAttendance: mode === "ONLINE" ? false : current.tripAttendance,
      tripAttendeeCount: mode === "ONLINE" ? 0 : current.tripAttendeeCount,
    }));
  }

  if (!snapshot) {
    return (
      <div className="card start-card">
        <h2 className="section-title">Bildiri Gönderimine Başlayın</h2>
        <p style={{ marginTop: 0, color: "#617089" }}>
          Taslağınıza daha sonra güvenli erişim linki ile geri dönebilmeniz için e-posta adresinizi
          ve bildirinizin dilini seçin.
        </p>
        <form className="submission-form-panel" onSubmit={startDraft}>
          <div className="grid two">
            <div className="field">
              <label htmlFor="draft-email">
                E-posta <span className="required">*</span>
              </label>
              <input
                id="draft-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@universite.edu.tr"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="draft-language">
                Bildirinizin Dili <span className="required">*</span>
              </label>
              <select
                id="draft-language"
                value={draftLanguage}
                onChange={(event) => {
                  const nextLanguage = event.target.value as "TR" | "EN";
                  setDraftLanguage(nextLanguage);
                  setDetails((current) => ({
                    ...current,
                    submissionLanguage: nextLanguage,
                  }));
                }}
              >
                <option value="TR">Türkçe</option>
                <option value="EN">İngilizce</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <div>
              {draftMessage ? <div className="notice">{draftMessage}</div> : null}
              {magicLinkPreview ? (
                <div className="magic-preview">
                  <strong>Test için oluşturulan erişim linki</strong>
                  <p style={{ margin: "10px 0 14px", color: "#284777" }}>
                    Gerçek e-posta servisi bağlı olmadığı için bu link ekranda gösteriliyor.
                    Tıklayarak taslağı açabilirsiniz.
                  </p>
                  <a className="button primary" href={magicLinkPreview} style={{ display: "inline-flex" }}>
                    Taslağı Aç
                  </a>
                </div>
              ) : null}
              {error ? <div className="error">{error}</div> : null}
            </div>
            <button className="button primary" disabled={loading} type="submit">
              {loading ? "Hazırlanıyor..." : "Taslağı Başlat"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="steps">
        {[1, 2, 3, 4, 5].map((item) => (
          <div className={`step ${activeStep === item ? "active" : activeStep > item ? "done" : ""}`} key={item}>
            <span className="step-badge">{item}</span>
            <span>
              {item === 1
                ? "Bildiri Bilgileri"
                : item === 2
                  ? "Yazarlar"
                  : item === 3
                    ? "Katılım"
                    : item === 4
                      ? "Ücret"
                      : "Gönder"}
            </span>
            {item < 5 ? <span className="step-separator">→</span> : null}
          </div>
        ))}
      </div>

      <div className="card wizard-card">
        <h2 className="section-title">
          {step === 1
            ? "Bildiri Bilgileri"
            : step === 2
              ? "Yazarlar"
              : step === 3
                ? "Katılım ve Sosyal Faaliyetler"
                : step === 4
                  ? "Ücret ve Dekont"
                  : "Son Kontrol"}
        </h2>

        {step === 1 ? (
          <form className="submission-form-panel" onSubmit={saveDetails}>
            <div className="field-row" style={{ marginBottom: 18 }}>
              <span className="pill">Bildiri Dili: {selectedLanguageLabel}</span>
              <span className="pill" style={{ background: "#eef4fb" }}>
                Taslak Sahibi: {snapshot.draftOwnerEmail}
              </span>
            </div>

            <div className="field" style={{ marginBottom: 20 }}>
              <label htmlFor="file">
                Ana Dosya {!hasExistingFile ? <span className="required">*</span> : null}
              </label>
              <input
                id="file"
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <span className="field-hint">
                Sadece DOCX, maksimum 10 MB.
                {snapshot.file ? ` Mevcut dosya: ${snapshot.file.originalName}` : ""}
              </span>
            </div>

            <div className="form-stack">
              {details.submissionLanguage === "TR" ? (
                <>
                  <div className="field">
                    <label htmlFor="title-tr">
                      Başlık (Türkçe) <span className="required">*</span>
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
                      Özet (Türkçe) <span className="required">*</span>
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
                      Anahtar Kelimeler (Türkçe) <span className="required">*</span>
                    </label>
                    <input
                      id="keywords-tr"
                      value={details.keywordsTr}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, keywordsTr: event.target.value }))
                      }
                      placeholder="Virgülle ayırın"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="field">
                    <label htmlFor="title-en">
                      Title (English) <span className="required">*</span>
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
                      Abstract (English) <span className="required">*</span>
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
                      Keywords (English) <span className="required">*</span>
                    </label>
                    <input
                      id="keywords-en"
                      value={details.keywordsEn}
                      onChange={(event) =>
                        setDetails((current) => ({ ...current, keywordsEn: event.target.value }))
                      }
                      placeholder="Separate with commas"
                    />
                  </div>
                </>
              )}
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <span />
              <button className="button primary" disabled={loading} type="submit">
                {loading ? "Kaydediliyor..." : "İleri"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="submission-form-panel" onSubmit={saveAuthors}>
            <div className="grid" style={{ gap: 16 }}>
              {authors.map((author, index) => (
                <div className="author-card" key={author.localId}>
                  <div className="author-head">
                    <strong>{index + 1}. Yazar</strong>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <label className="radio-line">
                        <input
                          checked={author.isPresenter}
                          name="presenter"
                          onChange={() => updateAuthor(index, { isPresenter: true })}
                          type="radio"
                        />
                        Sunan yazar
                      </label>
                      {authors.length > 1 ? (
                        <button
                          className="button ghost"
                          onClick={() => removeAuthor(index)}
                          type="button"
                        >
                          Sil
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid two">
                    <div className="field">
                      <label>
                        Ad Soyad <span className="required">*</span>
                      </label>
                      <input
                        value={author.fullName}
                        onChange={(event) => updateAuthor(index, { fullName: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>
                        E-posta <span className="required">*</span>
                      </label>
                      <input
                        type="email"
                        value={author.email}
                        onChange={(event) => updateAuthor(index, { email: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Kurum</label>
                      <input
                        value={author.institution}
                        onChange={(event) => updateAuthor(index, { institution: event.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Ülke</label>
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
                + Yazar Ekle
              </button>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(1)} type="button">
                Geri
              </button>
              <button className="button primary" disabled={loading} type="submit">
                {loading ? "Kaydediliyor..." : "İleri"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form className="submission-form-panel" onSubmit={saveParticipation}>
            <div className="field" style={{ marginBottom: 22 }}>
              <label>
                Sunum Şekli <span className="required">*</span>
              </label>
              <div className="option-cards">
                <label
                  className={`option-card${participation.presentationMode === "IN_PERSON" ? " is-selected" : ""}`}
                >
                  <input
                    checked={participation.presentationMode === "IN_PERSON"}
                    name="presentation-mode"
                    onChange={() => updateParticipationMode("IN_PERSON")}
                    type="radio"
                  />
                  <span className="option-card-title">Yüz Yüze</span>
                  <span className="option-card-meta">
                    Etkinlik salonunda fiziksel katılım
                  </span>
                </label>
                <label
                  className={`option-card${participation.presentationMode === "ONLINE" ? " is-selected" : ""}`}
                >
                  <input
                    checked={participation.presentationMode === "ONLINE"}
                    name="presentation-mode"
                    onChange={() => updateParticipationMode("ONLINE")}
                    type="radio"
                  />
                  <span className="option-card-title">Çevrim İçi</span>
                  <span className="option-card-meta">
                    Sosyal etkinlikler katılım dışıdır
                  </span>
                </label>
              </div>
            </div>

            <div className="grid two">
              <div className="author-card">
                <h3>Gala Yemeği</h3>
                <div className="form-stack">
                  <div className="field">
                    <label htmlFor="gala-attendance">Katılım</label>
                    <select
                      id="gala-attendance"
                      value={participation.galaAttendance ? "yes" : "no"}
                      onChange={(event) => {
                        const attends = event.target.value === "yes";
                        setParticipation((current) => ({
                          ...current,
                          galaAttendance: attends,
                          galaAttendeeCount: attends
                            ? current.galaAttendeeCount > 0
                              ? current.galaAttendeeCount
                              : 1
                            : 0,
                        }));
                      }}
                    >
                      <option value="no">Hayır, katılmayacağım</option>
                      <option value="yes">Evet, katılacağım</option>
                    </select>
                    <span className="field-hint">
                      Kişi başı {formatCurrency(config.gala.amount, config.gala.currency)}.
                      {config.gala.note ? ` ${config.gala.note}` : ""}
                    </span>
                  </div>
                  <div className="field">
                    <label htmlFor="gala-count">Kaç kişi katılmayı planlıyor?</label>
                    <input
                      disabled={!participation.galaAttendance}
                      id="gala-count"
                      min={1}
                      type="number"
                      value={participation.galaAttendance ? participation.galaAttendeeCount : 0}
                      onChange={(event) =>
                        setParticipation((current) => ({
                          ...current,
                          galaAttendeeCount: Number(event.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="author-card">
                <h3>Gezi</h3>
                <div className="form-stack">
                  <div className="field">
                    <label htmlFor="trip-attendance">Katılım</label>
                    <select
                      id="trip-attendance"
                      value={participation.tripAttendance ? "yes" : "no"}
                      onChange={(event) => {
                        const attends = event.target.value === "yes";
                        setParticipation((current) => ({
                          ...current,
                          tripAttendance: attends,
                          tripAttendeeCount: attends
                            ? current.tripAttendeeCount > 0
                              ? current.tripAttendeeCount
                              : 1
                            : 0,
                        }));
                      }}
                    >
                      <option value="no">Hayır, katılmayacağım</option>
                      <option value="yes">Evet, katılacağım</option>
                    </select>
                    <span className="field-hint">
                      {config.trip.note || "Gezi ücretsizdir."}
                    </span>
                  </div>
                  <div className="field">
                    <label htmlFor="trip-count">Kaç kişi katılmayı planlıyor?</label>
                    <input
                      disabled={!participation.tripAttendance}
                      id="trip-count"
                      min={1}
                      type="number"
                      value={participation.tripAttendance ? participation.tripAttendeeCount : 0}
                      onChange={(event) =>
                        setParticipation((current) => ({
                          ...current,
                          tripAttendeeCount: Number(event.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(2)} type="button">
                Geri
              </button>
              <button className="button primary" disabled={loading} type="submit">
                {loading ? "Kaydediliyor..." : "İleri"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 4 ? (
          <form className="submission-form-panel" onSubmit={savePayment}>
            {isPaymentClosed ? (
              <div className="error">
                Kayıt süresi sona erdiği için yeni ödeme ve gönderim alınmıyor.
              </div>
            ) : null}

            <div className="field-row" style={{ marginBottom: 18 }}>
              <span className="pill">
                Sunum: {participation.presentationMode === "ONLINE" ? "Çevrim İçi" : "Yüz Yüze"}
              </span>
              {participation.presentationMode === "IN_PERSON" && config.currentPeriod ? (
                <span className="pill" style={{ background: "#eef4fb" }}>
                  Dönem: {mapPaymentPeriod(config.currentPeriod)}
                </span>
              ) : null}
            </div>

            <div className="grid two">
              <div className="author-card">
                <h3>Katılım Bilgileri</h3>
                <div className="form-stack">
                  <div className="field">
                    <label>
                      Katılım Türü <span className="required">*</span>
                    </label>
                    <div className="option-cards">
                      <label
                        className={`option-card${payment.attendeeRole === "PRESENTER" ? " is-selected" : ""}`}
                      >
                        <input
                          checked={payment.attendeeRole === "PRESENTER"}
                          name="attendee-role"
                          onChange={() =>
                            setPayment((current) => ({
                              attendeeRole: "PRESENTER",
                              audience:
                                participation.presentationMode === "IN_PERSON"
                                  ? current.audience
                                  : null,
                              onlinePaperCount:
                                participation.presentationMode === "ONLINE"
                                  ? current.onlinePaperCount
                                  : null,
                            }))
                          }
                          type="radio"
                        />
                        <span className="option-card-title">Sunumlu Katılımcı</span>
                        <span className="option-card-meta">Bildiri sunacak</span>
                      </label>
                      <label
                        className={`option-card${payment.attendeeRole === "LISTENER" ? " is-selected" : ""}`}
                      >
                        <input
                          checked={payment.attendeeRole === "LISTENER"}
                          name="attendee-role"
                          onChange={() =>
                            setPayment(() => ({
                              attendeeRole: "LISTENER",
                              audience:
                                participation.presentationMode === "IN_PERSON"
                                  ? payment.audience
                                  : null,
                              onlinePaperCount: null,
                            }))
                          }
                          type="radio"
                        />
                        <span className="option-card-title">Dinleyici</span>
                        <span className="option-card-meta">Sadece izleyecek</span>
                      </label>
                    </div>
                  </div>

                  {participation.presentationMode === "IN_PERSON" ? (
                    <div className="field">
                      <label>
                        Akademik Statü <span className="required">*</span>
                      </label>
                      <div className="option-cards">
                        <label
                          className={`option-card${payment.audience === "ACADEMIC" ? " is-selected" : ""}`}
                        >
                          <input
                            checked={payment.audience === "ACADEMIC"}
                            name="audience"
                            onChange={() =>
                              setPayment((current) => ({ ...current, audience: "ACADEMIC" }))
                            }
                            type="radio"
                          />
                          <span className="option-card-title">Akademisyen</span>
                          <span className="option-card-meta">Öğretim üyesi / araştırmacı</span>
                        </label>
                        <label
                          className={`option-card${payment.audience === "STUDENT" ? " is-selected" : ""}`}
                        >
                          <input
                            checked={payment.audience === "STUDENT"}
                            name="audience"
                            onChange={() =>
                              setPayment((current) => ({ ...current, audience: "STUDENT" }))
                            }
                            type="radio"
                          />
                          <span className="option-card-title">Öğrenci</span>
                          <span className="option-card-meta">Lisans / yüksek lisans / doktora</span>
                        </label>
                      </div>
                    </div>
                  ) : null}

                  {participation.presentationMode === "ONLINE" &&
                  payment.attendeeRole === "PRESENTER" ? (
                    <div className="field">
                      <label>
                        Bildiri Sayısı <span className="required">*</span>
                      </label>
                      <div className="option-cards">
                        <label
                          className={`option-card${payment.onlinePaperCount === 1 ? " is-selected" : ""}`}
                        >
                          <input
                            checked={payment.onlinePaperCount === 1}
                            name="online-paper-count"
                            onChange={() =>
                              setPayment((current) => ({ ...current, onlinePaperCount: 1 }))
                            }
                            type="radio"
                          />
                          <span className="option-card-title">Tek Bildiri</span>
                          <span className="option-card-meta">Bir sunum hakkı</span>
                        </label>
                        <label
                          className={`option-card${payment.onlinePaperCount === 2 ? " is-selected" : ""}`}
                        >
                          <input
                            checked={payment.onlinePaperCount === 2}
                            name="online-paper-count"
                            onChange={() =>
                              setPayment((current) => ({ ...current, onlinePaperCount: 2 }))
                            }
                            type="radio"
                          />
                          <span className="option-card-title">İki Bildiri</span>
                          <span className="option-card-meta">İki ayrı sunum hakkı</span>
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="author-card">
                <h3>Hesap Özeti</h3>
                <div className="form-stack">
                  <div className="field">
                    <label>Hesaplanan Tutar</label>
                    <div className="amount-display">
                      {matchedTier
                        ? formatCurrency(matchedTier.amount, matchedTier.currency)
                        : "—"}
                      <span className="amount-display-meta">
                        {matchedTier
                          ? matchedTier.label
                          : "Seçimleri tamamladığınızda burada hesaplanır"}
                      </span>
                    </div>
                  </div>

                  <div className="field">
                    <label>Ödeme Açıklaması (Havale/EFT)</label>
                    <input
                      readOnly
                      value={
                        matchedTier && presenterName
                          ? `${presenterName} - ${matchedTier.label}`
                          : "Seçim yaptığınızda burada otomatik oluşur."
                      }
                    />
                    <span className="field-hint">
                      Havale açıklamasına bu ifadeyi yazın. Sunan yazarın adına ve seçilen kategoriye göre üretilir.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid two" style={{ marginTop: 18 }}>
              <div className="author-card">
                <h3>Banka Hesap Bilgileri</h3>
                <div className="form-stack">
                  <div className="field">
                    <label>Banka</label>
                    <input readOnly value={config.bank.bankName || "Belirtilmedi"} />
                  </div>
                  {config.bank.bankBranch ? (
                    <div className="field">
                      <label>Şube</label>
                      <input readOnly value={config.bank.bankBranch} />
                    </div>
                  ) : null}
                  <div className="field">
                    <label>Hesap Sahibi</label>
                    <input readOnly value={config.bank.bankAccountHolder || "Belirtilmedi"} />
                  </div>
                  <div className="field">
                    <label>IBAN</label>
                    <input readOnly value={config.bank.bankIban || "Belirtilmedi"} />
                  </div>
                </div>
              </div>

              <div className="author-card">
                <h3>Dekont</h3>
                {requiresReceipt ? (
                  <div className="field">
                    <label htmlFor="payment-receipt">
                      Dekont Yükle {!hasExistingReceipt ? <span className="required">*</span> : null}
                    </label>
                    <input
                      id="payment-receipt"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                    />
                    <span className="field-hint">
                      PDF, JPG, JPEG veya PNG, maksimum 10 MB.
                      {snapshot.paymentReceipt
                        ? ` Mevcut dekont: ${snapshot.paymentReceipt.originalName}`
                        : ""}
                    </span>
                    {participation.presentationMode === "ONLINE" && payment.onlinePaperCount === 2 ? (
                      <span className="field-hint">
                        Çevrim içi iki bildiri ödemesinde aynı dekontu ikinci bildiriniz için de
                        yeniden yükleyebilirsiniz.
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="notice" style={{ marginTop: 0 }}>
                    Bu kategori için ücret alınmadığından dekont yüklemenize gerek yoktur.
                  </div>
                )}
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(3)} type="button">
                Geri
              </button>
              <button className="button primary" disabled={loading || isPaymentClosed} type="submit">
                {loading ? "Kaydediliyor..." : "Kaydet ve İleri"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 5 ? (
          <div className="summary submission-form-panel">
            <div className="summary-block">
              <h3>Dil</h3>
              <p>{selectedLanguageLabel}</p>
            </div>
            <div className="summary-block">
              <h3>Sunum Şekli</h3>
              <p>{participation.presentationMode === "ONLINE" ? "Çevrim içi" : "Yüz yüze"}</p>
            </div>
            <div className="summary-block">
              <h3>{details.submissionLanguage === "TR" ? "Başlık" : "Title"}</h3>
              <p>{details.submissionLanguage === "TR" ? details.titleTr : details.titleEn}</p>
            </div>
            <div className="summary-block summary-block-wide">
              <h3>{details.submissionLanguage === "TR" ? "Özet" : "Abstract"}</h3>
              <p>{details.submissionLanguage === "TR" ? details.abstractTr : details.abstractEn}</p>
            </div>
            <div className="summary-block">
              <h3>{details.submissionLanguage === "TR" ? "Anahtar Kelimeler" : "Keywords"}</h3>
              <p>{details.submissionLanguage === "TR" ? details.keywordsTr : details.keywordsEn}</p>
            </div>
            <div className="summary-block">
              <h3>Dosya</h3>
              <p>{snapshot.file?.originalName ?? "Dosya yüklenmedi"}</p>
            </div>
            <div className="summary-block summary-block-wide">
              <h3>Yazarlar</h3>
              <ul className="summary-list">
                {authors.map((author) => (
                  <li key={author.localId}>
                    {author.fullName} - {author.email}
                    {author.isPresenter ? " (Sunan yazar)" : ""}
                  </li>
                ))}
              </ul>
            </div>
            <div className="summary-block">
              <h3>Sosyal Faaliyetler</h3>
              <ul className="summary-list">
                <li>
                  Gala: {participation.galaAttendance ? `Evet (${participation.galaAttendeeCount} kişi)` : "Hayır"}
                </li>
                <li>
                  Gezi: {participation.tripAttendance ? `Evet (${participation.tripAttendeeCount} kişi)` : "Hayır"}
                </li>
              </ul>
            </div>
            <div className="summary-block">
              <h3>Ücret Bilgisi</h3>
              <ul className="summary-list">
                <li>Katılım: {mapAttendeeRole(snapshot.payment.attendeeRole)}</li>
                {snapshot.presentationMode === "IN_PERSON" ? (
                  <li>Akademik Statü: {mapAudience(snapshot.payment.audience)}</li>
                ) : null}
                <li>Kayıt Dönemi: {snapshot.payment.period ? mapPaymentPeriod(snapshot.payment.period) : "-"}</li>
                <li>Tutar: {formatCurrency(snapshot.payment.amount, snapshot.payment.currency)}</li>
                <li>Açıklama: {snapshot.payment.description || "-"}</li>
              </ul>
            </div>
            <div className="summary-block">
              <h3>Dekont</h3>
              <p>
                {snapshot.paymentReceipt?.originalName ??
                  ((snapshot.payment.amount ?? 0) > 0 ? "Dekont yüklenmedi" : "Bu kategori için dekont gerekmez")}
              </p>
            </div>
            <div className="summary-block summary-block-wide">
              <h3>Etik & Beyanlar</h3>
              <div className="checklist">
                {(Object.entries(declarationLabels) as Array<
                  [keyof SubmissionDeclarations, string]
                >).map(([key, label]) => (
                  <label className="check-item" key={key}>
                    <input
                      checked={declarations[key]}
                      onChange={(event) =>
                        setDeclarations((current) => ({
                          ...current,
                          [key]: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(4)} type="button">
                Geri
              </button>
              <button
                className="button primary"
                disabled={loading || !areDeclarationsComplete}
                onClick={submitFinal}
                type="button"
              >
                {loading ? "Gönderiliyor..." : "Bildiriyi Gönder"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
