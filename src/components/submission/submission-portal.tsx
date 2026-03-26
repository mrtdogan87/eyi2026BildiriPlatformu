"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SubmissionAuthorInput,
  SubmissionDetailsInput,
  SubmissionParticipationInput,
  SubmissionSnapshot,
} from "@/types/submission";

type Props = {
  congressSlug: string;
  initialSnapshot: SubmissionSnapshot | null;
};

type AuthorDraft = SubmissionAuthorInput & {
  localId: string;
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

const emptyAuthor = (): SubmissionAuthorInput => ({
  fullName: "",
  email: "",
  institution: "",
  country: "",
  isPresenter: false,
});

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

export function SubmissionPortal({ congressSlug, initialSnapshot }: Props) {
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
  const [declarations, setDeclarations] = useState({
    accuracy: false,
    originality: false,
    submissionLimit: false,
    kvkkConsent: false,
  });

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

  const [authors, setAuthors] = useState<AuthorDraft[]>(
    initialSnapshot?.authors.length
      ? initialSnapshot.authors.map((author) => createAuthorDraft(author, author.isPresenter))
      : [createAuthorDraft(emptyAuthor(), true)],
  );

  const activeStep = snapshot ? step : 0;
  const hasExistingFile = Boolean(snapshot?.file);
  const areDeclarationsComplete = Object.values(declarations).every(Boolean);

  const selectedLanguageLabel = useMemo(
    () => (details.submissionLanguage === "TR" ? "Türkçe" : "İngilizce"),
    [details.submissionLanguage],
  );

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
      if (!data.magicLinkPreview) {
        router.push(`/${congressSlug}/bildiri-gonder?draft=${data.submissionId as string}`);
        router.refresh();
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(details),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? "Bildiri bilgileri kaydedilemedi.");
      }

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
      }

      setSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
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
        headers: {
          "Content-Type": "application/json",
        },
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

      setSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(participation),
      });
      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error((data.error as string | undefined) ?? "Katılım bilgileri kaydedilemedi.");
      }

      setSnapshot((data.submission as SubmissionSnapshot | undefined) ?? null);
      setStep(4);
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
        headers: {
          "Content-Type": "application/json",
        },
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
          ? {
              ...author,
              ...patch,
            }
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
          Taslağınıza daha sonra tek kullanımlık link ile geri dönebilmeniz için e-posta adresinizi
          ve bildirinizin dilini seçin.
        </p>
        <form onSubmit={startDraft}>
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
        {[1, 2, 3, 4].map((item) => (
          <div className={`step ${activeStep === item ? "active" : activeStep > item ? "done" : ""}`} key={item}>
            <span className="step-badge">{item}</span>
            <span>
              {item === 1
                ? "Bildiri Bilgileri"
                : item === 2
                  ? "Yazarlar"
                  : item === 3
                    ? "Katılım"
                    : "Gönder"}
            </span>
            {item < 4 ? <span className="step-separator">→</span> : null}
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
                : "Özet Bilgiler"}
        </h2>

        {step === 1 ? (
          <form onSubmit={saveDetails}>
            <div className="grid two">
              <div className="field">
                <label htmlFor="file">
                  Ana Dosya {!hasExistingFile ? <span className="required">*</span> : null}
                </label>
                <input
                  id="file"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
                <span style={{ color: "#617089", fontSize: 14 }}>
                  Sadece DOCX, maksimum 10 MB.
                  {snapshot.file ? ` Mevcut dosya: ${snapshot.file.originalName}` : ""}
                </span>
              </div>
              <div className="field">
                <label>Bildiri Dili</label>
                <div className="field-display">{selectedLanguageLabel}</div>
              </div>
            </div>

            <div className="grid" style={{ marginTop: 20 }}>
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
              <div className="pill">Taslak sahibi: {snapshot.draftOwnerEmail}</div>
              <button className="button primary" disabled={loading} type="submit">
                {loading ? "Kaydediliyor..." : "İleri"}
              </button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={saveAuthors}>
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
          <form onSubmit={saveParticipation}>
            <div className="grid two">
              <div className="field">
                <label htmlFor="presentation-mode">
                  Sunum Şekli <span className="required">*</span>
                </label>
                <select
                  id="presentation-mode"
                  value={participation.presentationMode}
                  onChange={(event) =>
                    updateParticipationMode(event.target.value as "ONLINE" | "IN_PERSON")
                  }
                >
                  <option value="IN_PERSON">Yüz yüze</option>
                  <option value="ONLINE">Online</option>
                </select>
              </div>
              <div className="field">
                <label>Bilgilendirme</label>
                <div className="field-display field-note">
                  Online seçildiğinde gala ve gezi varsayılan olarak hayır olur. İsterseniz yine de
                  değiştirebilirsiniz.
                </div>
              </div>
            </div>

            <div className="grid two" style={{ marginTop: 20 }}>
              <div className="author-card">
                <div className="field">
                  <label htmlFor="gala-attendance">Gala Katılımı</label>
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
                    <option value="no">Hayır</option>
                    <option value="yes">Evet</option>
                  </select>
                </div>
                <div className="field" style={{ marginTop: 16 }}>
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

              <div className="author-card">
                <div className="field">
                  <label htmlFor="trip-attendance">Gezi Katılımı</label>
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
                    <option value="no">Hayır</option>
                    <option value="yes">Evet</option>
                  </select>
                </div>
                <div className="field" style={{ marginTop: 16 }}>
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
          <div className="summary">
            <div className="summary-block">
              <h3>Dil</h3>
              <p>{selectedLanguageLabel}</p>
            </div>
            <div className="summary-block">
              <h3>Sunum Şekli</h3>
              <p>{participation.presentationMode === "ONLINE" ? "Online" : "Yüz yüze"}</p>
            </div>
            <div className="summary-block">
              <h3>{details.submissionLanguage === "TR" ? "Başlık" : "Title"}</h3>
              <p>{details.submissionLanguage === "TR" ? details.titleTr : details.titleEn}</p>
            </div>
            <div className="summary-block">
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
            <div className="summary-block">
              <h3>Yazarlar</h3>
              <ul className="summary-list">
                {authors.map((author) => (
                  <li key={author.email}>
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
              <h3>Etik & Beyanlar</h3>
              <div className="checklist">
                <label className="check-item">
                  <input
                    checked={declarations.accuracy}
                    onChange={(event) =>
                      setDeclarations((current) => ({ ...current, accuracy: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <span>Başvuru sahibi olarak, bu formda verdiğim bilgilerin doğruluğunu beyan ederim.</span>
                </label>
                <label className="check-item">
                  <input
                    checked={declarations.originality}
                    onChange={(event) =>
                      setDeclarations((current) => ({ ...current, originality: event.target.checked }))
                    }
                    type="checkbox"
                  />
                  <span>Bu çalışma özgündür ve başka bir yerde değerlendirmede değildir.</span>
                </label>
                <label className="check-item">
                  <input
                    checked={declarations.submissionLimit}
                    onChange={(event) =>
                      setDeclarations((current) => ({
                        ...current,
                        submissionLimit: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>Bir isim en fazla iki bildiride yer alabilir kuralını kabul ediyorum.</span>
                </label>
                <label className="check-item">
                  <input
                    checked={declarations.kvkkConsent}
                    onChange={(event) =>
                      setDeclarations((current) => ({
                        ...current,
                        kvkkConsent: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>Kişisel verilerimin kongre süreçleri kapsamında işlenmesine onay veriyorum.</span>
                </label>
              </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="form-actions">
              <button className="button secondary" onClick={() => setStep(3)} type="button">
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
