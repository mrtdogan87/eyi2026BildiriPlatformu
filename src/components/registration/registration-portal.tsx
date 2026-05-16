"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrencyAmount, mapPaymentPeriod } from "@/lib/payment";
import type {
  AudienceType,
  PaymentTierOption,
  PresentationMode,
  RegistrationContext,
} from "@/types/submission";

type Props = {
  context: RegistrationContext;
};

type RegistrationDeclarations = {
  accuracy: boolean;
  submissionLimit: boolean;
  coauthorApproval: boolean;
  personalDataConsent: boolean;
  registrationPresentationConsent: boolean;
};

const emptyDeclarations: RegistrationDeclarations = {
  accuracy: false,
  submissionLimit: false,
  coauthorApproval: false,
  personalDataConsent: false,
  registrationPresentationConsent: false,
};

const declarationLabels: Record<keyof RegistrationDeclarations, string> = {
  accuracy:
    "Başvuru sahibi olarak, bu form kapsamında tarafımdan sunulan tüm bilgi ve belgelerin doğru, eksiksiz ve güncel olduğunu beyan ederim.",
  submissionLimit:
    "Kongre kapsamında geçerli olan, bir araştırmacının en fazla iki bildiride yazar olarak yer alabileceği kuralını okuduğumu, anladığımı ve kabul ettiğimi beyan ederim.",
  coauthorApproval:
    "Başvurusu yapılan çalışmada adı geçen diğer yazarların çalışmadan, başvuru sürecinden ve bildiri içeriğinden haberdar olduğunu; tüm ortak yazarlardan gerekli izin ve onayın tarafımca alındığını beyan ederim.",
  personalDataConsent:
    "Kongre başvuru, değerlendirme, program oluşturma, sertifika düzenleme ve ilgili akademik/idari süreçlerin yürütülmesi amacıyla kişisel verilerimin işlenmesine onay verdiğimi kabul ederim.",
  registrationPresentationConsent:
    "Bildiri kabul edilse dahi, kongre kurallarında belirtilen kayıt ve sunum yükümlülüklerinin yerine getirilmemesi durumunda çalışmanın programa alınmayabileceğini veya yayımlanmayabileceğini kabul ederim.",
};

type ListenerTierKey = "ONLINE" | "IN_PERSON_ACADEMIC" | "IN_PERSON_STUDENT";

const LISTENER_TIER_KEYS: Array<{
  key: ListenerTierKey;
  presentationMode: PresentationMode;
  audience: AudienceType | null;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    key: "IN_PERSON_ACADEMIC",
    presentationMode: "IN_PERSON",
    audience: "ACADEMIC",
    label: "Yüz Yüze · Akademik Personel",
    description: "Salon katılımı, akademik personel tarifesi",
    icon: "🎓",
  },
  {
    key: "IN_PERSON_STUDENT",
    presentationMode: "IN_PERSON",
    audience: "STUDENT",
    label: "Yüz Yüze · Öğrenci",
    description: "Salon katılımı, öğrenci tarifesi",
    icon: "📘",
  },
  {
    key: "ONLINE",
    presentationMode: "ONLINE",
    audience: null,
    label: "Çevrim İçi",
    description: "Uzaktan katılım · ücretsiz",
    icon: "💻",
  },
];

function findListenerTier(
  tiers: PaymentTierOption[],
  presentationMode: PresentationMode,
  audience: AudienceType | null,
  period: "EARLY" | "LATE" | null,
): PaymentTierOption | null {
  return (
    tiers.find((tier) => {
      if (tier.role !== "LISTENER") return false;
      if (tier.presentationMode !== presentationMode) return false;
      if (presentationMode === "IN_PERSON") {
        if (tier.audience !== audience) return false;
        return tier.period === period;
      }
      return tier.audience === null && tier.period === null;
    }) ?? null
  );
}

function findPaperTier(
  tiers: PaymentTierOption[],
  audience: AudienceType | null,
  paperOrder: 1 | 2,
  period: "EARLY" | "LATE",
): PaymentTierOption | null {
  return (
    tiers.find(
      (tier) =>
        tier.role === "PRESENTER" &&
        tier.presentationMode === null &&
        tier.audience === audience &&
        tier.paperOrder === paperOrder &&
        tier.period === period,
    ) ?? null
  );
}

export function RegistrationPortal({ context }: Props) {
  const router = useRouter();
  const { config } = context;

  const [presenterName, setPresenterName] = useState("");
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [listenerSelection, setListenerSelection] = useState<ListenerTierKey | null>(null);
  const [galaAttendance, setGalaAttendance] = useState(false);
  const [galaAttendeeCount, setGalaAttendeeCount] = useState(1);
  const [tripAttendance, setTripAttendance] = useState(false);
  const [tripAttendeeCount, setTripAttendeeCount] = useState(1);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [declarations, setDeclarations] = useState<RegistrationDeclarations>(emptyDeclarations);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedDescription, setCopiedDescription] = useState(false);

  const areDeclarationsComplete = Object.values(declarations).every(Boolean);

  const hasAcceptedPapers = context.acceptedPapers.length > 0;
  const period = config.currentPeriod ?? null;

  useEffect(() => {
    if (!hasAcceptedPapers) {
      setListenerEnabled(true);
      if (!listenerSelection) setListenerSelection("ONLINE");
    }
  }, [hasAcceptedPapers, listenerSelection]);

  const selectedPapers = useMemo(
    () =>
      context.acceptedPapers.filter((paper) =>
        selectedSubmissionIds.includes(paper.submissionId),
      ),
    [context.acceptedPapers, selectedSubmissionIds],
  );

  type Line = {
    key: string;
    label: string;
    detail?: string;
    amount: number;
    currency: string;
  };

  const computed = useMemo<{
    paperLines: Line[];
    listenerLine: Line | null;
    galaLine: Line | null;
    tripLine: Line;
    paperTotal: number;
    grandLines: Line[];
    paperCurrency: string;
    description: string;
    error: string | null;
  }>(() => {
    let runningError: string | null = null;
    const paperLines: Line[] = [];
    let paperTotal = 0;
    let paperCurrency = "TRY";

    if (selectedPapers.length && !period) {
      runningError = "Kayıt süresi sona ermiş.";
    }

    selectedPapers.forEach((paper, index) => {
      const order: 1 | 2 = index === 0 ? 1 : 2;
      const tier = period
        ? findPaperTier(config.tiers, paper.audience, order, period)
        : null;
      if (!tier) {
        runningError = `Bildiri için ücret tanımı bulunamadı: ${paper.title}`;
        return;
      }
      paperTotal += tier.amount;
      paperCurrency = tier.currency;
      paperLines.push({
        key: `paper:${paper.submissionId}`,
        label: paper.title,
        detail:
          (order === 1 ? "Birinci Bildiri" : "İkinci Bildiri (%50 İndirim)") +
          (paper.audience === "ACADEMIC" ? " · Akademik Personel" : paper.audience === "STUDENT" ? " · Öğrenci" : ""),
        amount: tier.amount,
        currency: tier.currency,
      });
    });

    let listenerLine: Line | null = null;
    if (listenerEnabled) {
      if (!listenerSelection) {
        runningError = "Dinleyici tipini seçin.";
      } else {
        const selection = LISTENER_TIER_KEYS.find((key) => key.key === listenerSelection)!;
        const tier = findListenerTier(
          config.tiers,
          selection.presentationMode,
          selection.audience,
          selection.presentationMode === "IN_PERSON" ? period : null,
        );
        if (!tier) {
          runningError = "Dinleyici için ücret tanımı bulunamadı.";
        } else {
          listenerLine = {
            key: "listener",
            label: selection.label,
            detail: tier.amount === 0 ? "Ücretsiz" : undefined,
            amount: tier.amount,
            currency: tier.currency,
          };
          paperTotal += tier.amount;
          if (tier.amount > 0) paperCurrency = tier.currency;
        }
      }
    }

    let galaLine: Line | null = null;
    if (galaAttendance && galaAttendeeCount > 0) {
      const galaTotal = config.gala.amount * galaAttendeeCount;
      galaLine = {
        key: "gala",
        label: `Gala Yemeği · ${galaAttendeeCount} kişi`,
        detail: `Kişi başı ${formatCurrencyAmount(config.gala.amount, config.gala.currency)}`,
        amount: galaTotal,
        currency: config.gala.currency,
      };
    }

    const tripLine: Line = {
      key: "trip",
      label: tripAttendance ? `Gezi · ${tripAttendeeCount} kişi` : "Gezi",
      detail: config.trip.note || "Ücretsiz",
      amount: 0,
      currency: paperCurrency,
    };

    const lines = [...paperLines];
    if (listenerLine) lines.push(listenerLine);
    if (galaLine) lines.push(galaLine);
    lines.push(tripLine);

    const trimmedName = presenterName.trim();
    const descriptionParts: string[] = [];
    if (trimmedName) descriptionParts.push(trimmedName);
    if (paperLines.length === 1) descriptionParts.push("1 Bildiri");
    if (paperLines.length > 1) descriptionParts.push(`${paperLines.length} Bildiri`);
    if (listenerLine && listenerLine.amount > 0) descriptionParts.push("Dinleyici");
    if (period) descriptionParts.push(mapPaymentPeriod(period));

    return {
      paperLines,
      listenerLine,
      galaLine,
      tripLine,
      paperTotal,
      grandLines: lines,
      paperCurrency,
      description: descriptionParts.join(" · ") || "Henüz seçim yapılmadı",
      error: runningError,
    };
  }, [
    selectedPapers,
    period,
    config.tiers,
    config.gala,
    config.trip,
    listenerEnabled,
    listenerSelection,
    galaAttendance,
    galaAttendeeCount,
    tripAttendance,
    tripAttendeeCount,
    presenterName,
  ]);

  const needsReceipt = computed.paperTotal > 0 || Boolean(computed.galaLine);

  function toggleSubmission(submissionId: string) {
    setSelectedSubmissionIds((current) =>
      current.includes(submissionId)
        ? current.filter((id) => id !== submissionId)
        : [...current, submissionId],
    );
  }

  async function copyDescription() {
    try {
      await navigator.clipboard.writeText(computed.description);
      setCopiedDescription(true);
      setTimeout(() => setCopiedDescription(false), 1500);
    } catch {
      setCopiedDescription(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (computed.error) {
      setError(computed.error);
      return;
    }
    if (!presenterName.trim()) {
      setError("Ad soyad alanını doldurmalısınız.");
      return;
    }
    if (!selectedSubmissionIds.length && !listenerEnabled) {
      setError("En az bir bildiri seçmeli ya da dinleyici olarak kaydolmalısınız.");
      return;
    }
    if (!areDeclarationsComplete) {
      setError("Kaydı tamamlamak için tüm beyanları onaylamalısınız.");
      return;
    }
    if (needsReceipt && !receiptFile) {
      setError("Dekont yüklemelisiniz.");
      return;
    }

    setError("");
    setLoading(true);

    const listenerSelectionEntry = listenerEnabled
      ? LISTENER_TIER_KEYS.find((key) => key.key === listenerSelection)
      : null;

    const formData = new FormData();
    formData.append("presenterName", presenterName.trim());
    formData.append("paperSubmissionIds", JSON.stringify(selectedSubmissionIds));
    formData.append("listenerEnabled", listenerEnabled ? "true" : "false");
    if (listenerSelectionEntry) {
      formData.append("listenerPresentationMode", listenerSelectionEntry.presentationMode);
      if (listenerSelectionEntry.audience) {
        formData.append("listenerAudience", listenerSelectionEntry.audience);
      }
    }
    formData.append("galaAttendance", galaAttendance ? "true" : "false");
    formData.append("galaAttendeeCount", String(galaAttendance ? galaAttendeeCount : 0));
    formData.append("tripAttendance", tripAttendance ? "true" : "false");
    formData.append("tripAttendeeCount", String(tripAttendance ? tripAttendeeCount : 0));
    if (receiptFile) formData.append("receipt", receiptFile);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Kayıt tamamlanamadı.");
      }
      router.push(`/${context.congressSlug}/kayit/basarili`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="submission-form-panel registration-portal" onSubmit={handleSubmit}>
      <div className="field-row" style={{ marginBottom: 18 }}>
        <span className="pill">E-posta: {context.email}</span>
        {period ? (
          <span className="pill" style={{ background: "#eef4fb" }}>
            Aktif Dönem: {mapPaymentPeriod(period)}
          </span>
        ) : (
          <span className="pill" style={{ background: "#fff4e5", color: "var(--warning)" }}>
            Kayıt süresi sona erdi
          </span>
        )}
      </div>

      <div className="grid two">
        <div className="author-card">
          <h3>Ad Soyad</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="presenter-name">
                Havale Açıklamasında Görünecek Ad Soyad <span className="required">*</span>
              </label>
              <input
                id="presenter-name"
                onChange={(event) => setPresenterName(event.target.value)}
                placeholder="Ad Soyad"
                value={presenterName}
              />
            </div>
          </div>
        </div>

        <div className="author-card">
          <h3>Kabul Edilmiş Bildirileriniz</h3>
          {hasAcceptedPapers ? (
            <div className="paper-list">
              {context.acceptedPapers.map((paper) => (
                <label
                  key={paper.submissionId}
                  className={`paper-item${paper.alreadyPaid ? " is-paid" : ""}`}
                >
                  <input
                    checked={selectedSubmissionIds.includes(paper.submissionId)}
                    disabled={paper.alreadyPaid}
                    onChange={() => toggleSubmission(paper.submissionId)}
                    type="checkbox"
                  />
                  <div>
                    <strong>{paper.title}</strong>
                    <p>
                      {paper.audience === "ACADEMIC" ? "Akademik Personel" : paper.audience === "STUDENT" ? "Öğrenci" : "—"}
                      {" · "}
                      {paper.presentationMode === "IN_PERSON" ? "Yüz Yüze" : paper.presentationMode === "ONLINE" ? "Çevrim İçi" : "—"}
                      {paper.alreadyPaid ? " · ✅ Ödendi" : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              Bu e-postaya bağlı kabul edilmiş bildiri bulunmuyor. Dinleyici olarak kaydolabilirsiniz.
            </p>
          )}
        </div>
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>Dinleyici Katılımı</h3>
        <div className="form-stack">
          <label className="radio-line" style={{ alignSelf: "flex-start" }}>
            <input
              checked={listenerEnabled}
              onChange={(event) => {
                setListenerEnabled(event.target.checked);
                if (event.target.checked && !listenerSelection) setListenerSelection("ONLINE");
              }}
              type="checkbox"
            />
            Dinleyici olarak da katılmak istiyorum
          </label>

          {listenerEnabled ? (
            <div className="option-cards option-cards-rich">
              {LISTENER_TIER_KEYS.map((entry) => (
                <label
                  key={entry.key}
                  className={`option-card option-card-rich${listenerSelection === entry.key ? " is-selected" : ""}`}
                >
                  <input
                    checked={listenerSelection === entry.key}
                    name="listener-tier"
                    onChange={() => setListenerSelection(entry.key)}
                    type="radio"
                  />
                  <span className="option-card-icon" aria-hidden>{entry.icon}</span>
                  <span className="option-card-title">{entry.label}</span>
                  <span className="option-card-meta">{entry.description}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="author-card">
          <h3>Gala Yemeği</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="gala">Katılım</label>
              <select
                id="gala"
                onChange={(event) => {
                  const yes = event.target.value === "yes";
                  setGalaAttendance(yes);
                  if (yes && galaAttendeeCount < 1) setGalaAttendeeCount(1);
                }}
                value={galaAttendance ? "yes" : "no"}
              >
                <option value="no">Hayır, katılmayacağım</option>
                <option value="yes">Evet, katılacağım</option>
              </select>
              <span className="field-hint">
                Kişi başı {formatCurrencyAmount(config.gala.amount, config.gala.currency)} · <strong>Gala ücretleri kayıt ücretinden ayrıca toplanacaktır.</strong>
                {config.gala.note ? ` ${config.gala.note}` : ""}
              </span>
            </div>
            <div className="field">
              <label htmlFor="gala-count">Kaç kişi?</label>
              <input
                disabled={!galaAttendance}
                id="gala-count"
                min={1}
                onChange={(event) => setGalaAttendeeCount(Number(event.target.value) || 0)}
                type="number"
                value={galaAttendance ? galaAttendeeCount : 0}
              />
            </div>
          </div>
        </div>

        <div className="author-card">
          <h3>Gezi</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="trip">Katılım</label>
              <select
                id="trip"
                onChange={(event) => {
                  const yes = event.target.value === "yes";
                  setTripAttendance(yes);
                  if (yes && tripAttendeeCount < 1) setTripAttendeeCount(1);
                }}
                value={tripAttendance ? "yes" : "no"}
              >
                <option value="no">Hayır, katılmayacağım</option>
                <option value="yes">Evet, katılacağım</option>
              </select>
              <span className="field-hint">{config.trip.note || "Gezi ücretsizdir."}</span>
            </div>
            <div className="field">
              <label htmlFor="trip-count">Kaç kişi?</label>
              <input
                disabled={!tripAttendance}
                id="trip-count"
                min={1}
                onChange={(event) => setTripAttendeeCount(Number(event.target.value) || 0)}
                type="number"
                value={tripAttendance ? tripAttendeeCount : 0}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>Hesap Özeti</h3>
        <div className="quote-list">
          {computed.grandLines
            .filter((line) => line.key !== "gala")
            .map((line) => (
              <div className="quote-row" key={line.key}>
                <div>
                  <strong>{line.label}</strong>
                  {line.detail ? <p>{line.detail}</p> : null}
                </div>
                <span>
                  {line.amount === 0 && line.currency === computed.paperCurrency
                    ? "Ücretsiz"
                    : formatCurrencyAmount(line.amount, line.currency)}
                </span>
              </div>
            ))}
        </div>
        <div className="quote-total">
          <span>Dekont Tutarı (Bildiri / Dinleyici)</span>
          <strong>{formatCurrencyAmount(computed.paperTotal, computed.paperCurrency)}</strong>
        </div>
        {computed.galaLine ? (
          <div className="notice" style={{ marginTop: 14 }}>
            <strong>Gala Yemeği · {galaAttendeeCount} kişi</strong> kaydınıza eklendi (toplam{" "}
            {formatCurrencyAmount(computed.galaLine.amount, computed.galaLine.currency)}). Gala
            ücretleri kayıt ücretinden ayrıdır ve kongre sekretaryası tarafından ayrıca toplanacaktır.
          </div>
        ) : null}
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
          <h3>Havale Açıklaması</h3>
          <div className="form-stack">
            <div className="field">
              <label>Bu metni havale açıklamasına yazın</label>
              <textarea
                readOnly
                rows={3}
                value={computed.description}
              />
            </div>
            <button
              className="button secondary"
              onClick={copyDescription}
              type="button"
            >
              {copiedDescription ? "Kopyalandı ✓" : "Açıklamayı Kopyala"}
            </button>
          </div>
        </div>
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>Dekont</h3>
        {needsReceipt ? (
          <div className="form-stack">
            <div className="field">
              <label htmlFor="receipt">
                Dekont Yükle <span className="required">*</span>
              </label>
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                id="receipt"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span className="field-hint">
                PDF, JPG, JPEG veya PNG, maksimum 10 MB. Yukarıdaki dekont tutarı için yapılan
                havalenin dekontunu yükleyin.
              </span>
            </div>
          </div>
        ) : (
          <div className="notice" style={{ marginTop: 0 }}>
            Seçtiğiniz kategoriler için ücret alınmadığından dekont gerekmez.
          </div>
        )}
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>Etik ve Beyanlar</h3>
        <div className="checklist">
          {(Object.entries(declarationLabels) as Array<
            [keyof RegistrationDeclarations, string]
          >).map(([key, label]) => (
            <label className="check-item" key={key}>
              <input
                checked={declarations[key]}
                onChange={(event) =>
                  setDeclarations((current) => ({ ...current, [key]: event.target.checked }))
                }
                type="checkbox"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {error || computed.error ? (
        <div className="error" style={{ marginTop: 18 }}>
          {error || computed.error}
        </div>
      ) : null}

      <div className="form-actions">
        <span />
        <button
          className="button primary"
          disabled={loading || !areDeclarationsComplete}
          type="submit"
        >
          {loading ? "Kaydediliyor..." : "Kaydı Tamamla"}
        </button>
      </div>
    </form>
  );
}
