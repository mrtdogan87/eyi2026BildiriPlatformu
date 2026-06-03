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

const DECLARATION_KEYS: (keyof RegistrationDeclarations)[] = [
  "accuracy",
  "submissionLimit",
  "coauthorApproval",
  "personalDataConsent",
  "registrationPresentationConsent",
];

type ListenerTierKey = "ONLINE" | "IN_PERSON_ACADEMIC" | "IN_PERSON_STUDENT";

const LISTENER_TIER_KEYS: Array<{
  key: ListenerTierKey;
  presentationMode: PresentationMode;
  audience: AudienceType | null;
  icon: string;
}> = [
  { key: "IN_PERSON_ACADEMIC", presentationMode: "IN_PERSON", audience: "ACADEMIC", icon: "🎓" },
  { key: "IN_PERSON_STUDENT", presentationMode: "IN_PERSON", audience: "STUDENT", icon: "📘" },
  { key: "ONLINE", presentationMode: "ONLINE", audience: null, icon: "💻" },
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
  const t = useT();
  const locale = useLocale();
  const { config } = context;

  const [presenterName, setPresenterName] = useState("");
  const [presenterTitle, setPresenterTitle] = useState("");
  const [presenterTitleOther, setPresenterTitleOther] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([]);
  const [listenerEnabled, setListenerEnabled] = useState(false);
  const [listenerSelection, setListenerSelection] = useState<ListenerTierKey | null>(null);
  // Dinleyici her zaman iki gün katılır; gün seçimi kaldırıldı.
  const [listenerDayOne] = useState(true);
  const [listenerDayTwo] = useState(true);
  // Gala/gezi ücretsiz; yalnızca kişinin kendisi katılacak mı sorulur, kişi sayısı alınmaz.
  const [galaAttendance, setGalaAttendance] = useState(false);
  const [tripAttendance, setTripAttendance] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [studentDocumentFile, setStudentDocumentFile] = useState<File | null>(null);
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
    tripLine: Line | null;
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
      runningError = t("registration.err.periodEnded");
    }

    selectedPapers.forEach((paper, index) => {
      const order: 1 | 2 = index === 0 ? 1 : 2;
      const tier = period
        ? findPaperTier(config.tiers, paper.audience, order, period)
        : null;
      // İkinci ve sonraki bildiriler ücretsizdir; yalnızca birinci bildiride ücret tanımı zorunlu.
      if (order === 1 && !tier) {
        runningError = t("registration.err.tierNotFound", { title: paper.title });
        return;
      }
      const amount = order === 1 ? (tier?.amount ?? 0) : 0;
      paperTotal += amount;
      paperCurrency = tier?.currency ?? paperCurrency;
      const audienceSuffix =
        paper.audience === "ACADEMIC"
          ? ` · ${t("quote.academic")}`
          : paper.audience === "STUDENT"
            ? ` · ${t("quote.student")}`
            : "";
      paperLines.push({
        key: `paper:${paper.submissionId}`,
        label: paper.title,
        detail:
          (order === 1 ? t("quote.firstPaper") : t("quote.secondPaperFree")) + audienceSuffix,
        amount,
        currency: tier?.currency ?? paperCurrency,
      });
    });

    let listenerLine: Line | null = null;
    if (listenerEnabled) {
      if (!listenerSelection) {
        runningError = t("registration.err.listenerTypeSelect");
      } else if (!listenerDayOne && !listenerDayTwo) {
        runningError = t("registration.err.listenerDay");
      } else {
        const selection = LISTENER_TIER_KEYS.find((key) => key.key === listenerSelection)!;
        const tier = findListenerTier(
          config.tiers,
          selection.presentationMode,
          selection.audience,
          selection.presentationMode === "IN_PERSON" ? period : null,
        );
        if (!tier) {
          runningError = t("registration.err.listenerTierNotFound");
        } else {
          // Dinleyici iki gün katılır ancak ücret günlük değil, tek (sabit) ücrettir.
          const listenerAmount = tier.amount;
          listenerLine = {
            key: "listener",
            label: `${t(`registration.listenerTier.${selection.key}.label`)} · ${t("quote.twoDays")}`,
            detail: tier.amount === 0 ? t("common.free") : undefined,
            amount: listenerAmount,
            currency: tier.currency,
          };
          paperTotal += listenerAmount;
          if (listenerAmount > 0) paperCurrency = tier.currency;
        }
      }
    }

    let galaLine: Line | null = null;
    if (galaAttendance) {
      const galaTotal = config.gala.amount;
      galaLine = {
        key: "gala",
        label: t("quote.galaLine"),
        detail:
          config.gala.amount === 0
            ? t("quote.galaFree")
            : t("quote.galaPerPerson", {
                amount: formatCurrencyAmount(config.gala.amount, config.gala.currency, locale),
              }),
        amount: galaTotal,
        currency: config.gala.currency,
      };
    }

    const tripLine: Line | null = tripAttendance
      ? {
          key: "trip",
          label: t("quote.tripLine"),
          detail: config.trip.note || t("quote.tripFree"),
          amount: 0,
          currency: paperCurrency,
        }
      : null;

    const lines = [...paperLines];
    if (listenerLine) lines.push(listenerLine);
    if (galaLine) lines.push(galaLine);
    if (tripLine) lines.push(tripLine);

    const trimmedName = [t("registration.transferCode"), presenterName.trim()]
      .filter(Boolean)
      .join(" ");
    const descriptionParts: string[] = [];
    if (trimmedName) descriptionParts.push(trimmedName);
    if (paperLines.length === 1) descriptionParts.push(t("registration.transferOnePaper"));
    if (paperLines.length > 1) {
      descriptionParts.push(t("registration.transferPaperCount", { count: paperLines.length }));
    }
    if (listenerLine && listenerLine.amount > 0) {
      descriptionParts.push(t("registration.transferListener"));
    }
    if (period) descriptionParts.push(t(period === "EARLY" ? "quote.periodEarly" : "quote.periodLate"));

    return {
      paperLines,
      listenerLine,
      galaLine,
      tripLine,
      paperTotal,
      grandLines: lines,
      paperCurrency,
      description: descriptionParts.join(" · ") || t("registration.noSelectionYet"),
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
    listenerDayOne,
    listenerDayTwo,
    galaAttendance,
    tripAttendance,
    presenterName,
    locale,
    t,
  ]);

  // Gala ücretsiz ve kayıt tutarına dahil değil; dekont yalnızca ödenecek tutar varsa gerekir.
  const needsReceipt = computed.paperTotal > 0;

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
      setError(t("registration.err.nameRequired"));
      return;
    }
    if (!presenterTitle.trim()) {
      setError(t("registration.err.titleRequired"));
      return;
    }
    if (!selectedSubmissionIds.length && !listenerEnabled) {
      setError(t("registration.err.selectPaperOrListener"));
      return;
    }
    if (!areDeclarationsComplete) {
      setError(t("registration.err.declarations"));
      return;
    }
    if (needsReceipt && !receiptFile) {
      setError(t("registration.err.receiptRequired"));
      return;
    }

    setError("");
    setLoading(true);

    const listenerSelectionEntry = listenerEnabled
      ? LISTENER_TIER_KEYS.find((key) => key.key === listenerSelection)
      : null;

    const formData = new FormData();
    formData.append(
      "presenterName",
      [presenterTitle.trim(), presenterName.trim()].filter(Boolean).join(" "),
    );
    formData.append("paperSubmissionIds", JSON.stringify(selectedSubmissionIds));
    formData.append("listenerEnabled", listenerEnabled ? "true" : "false");
    if (listenerSelectionEntry) {
      formData.append("listenerPresentationMode", listenerSelectionEntry.presentationMode);
      if (listenerSelectionEntry.audience) {
        formData.append("listenerAudience", listenerSelectionEntry.audience);
      }
      formData.append("listenerDayOne", listenerDayOne ? "true" : "false");
      formData.append("listenerDayTwo", listenerDayTwo ? "true" : "false");
    }
    formData.append("galaAttendance", galaAttendance ? "true" : "false");
    formData.append("galaAttendeeCount", galaAttendance ? "1" : "0");
    formData.append("tripAttendance", tripAttendance ? "true" : "false");
    formData.append("tripAttendeeCount", tripAttendance ? "1" : "0");
    if (receiptFile) formData.append("receipt", receiptFile);
    if (studentDocumentFile) formData.append("studentDocument", studentDocumentFile);

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? t("registration.err.registrationFailed"));
      }
      router.push(`/${context.congressSlug}/kayit/basarili`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="submission-form-panel registration-portal" onSubmit={handleSubmit}>
      <div className="field-row" style={{ marginBottom: 18 }}>
        <span className="pill">{t("registration.emailPill", { email: context.email })}</span>
        {period ? (
          <span className="pill" style={{ background: "#eef4fb" }}>
            {t("registration.activePeriod", {
              period: t(period === "EARLY" ? "quote.periodEarly" : "quote.periodLate"),
            })}
          </span>
        ) : (
          <span className="pill" style={{ background: "#fff4e5", color: "var(--warning)" }}>
            {t("registration.periodClosed")}
          </span>
        )}
      </div>

      <div className="grid two">
        <div className="author-card">
          <h3>{t("registration.nameTitleHeading")}</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="presenter-name">
                {t("registration.nameLabel")} <span className="required">*</span>
              </label>
              <input
                id="presenter-name"
                onChange={(event) => setPresenterName(event.target.value)}
                placeholder={t("registration.namePlaceholder")}
                value={presenterName}
              />
            </div>
            <div className="field">
              <label htmlFor="presenter-title">
                {t("registration.titleLabel")} <span className="required">*</span>
              </label>
              <select
                id="presenter-title"
                value={presenterTitleOther ? OTHER_TITLE : presenterTitle}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === OTHER_TITLE) {
                    setPresenterTitleOther(true);
                    setPresenterTitle("");
                  } else {
                    setPresenterTitleOther(false);
                    setPresenterTitle(value);
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
              {presenterTitleOther ? (
                <input
                  style={{ marginTop: 8 }}
                  placeholder={t("registration.titleOtherPlaceholder")}
                  value={presenterTitle}
                  onChange={(event) => setPresenterTitle(event.target.value)}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="author-card">
          <h3>{t("registration.acceptedPapersHeading")}</h3>
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
                      {paper.audience === "ACADEMIC" ? t("quote.academic") : paper.audience === "STUDENT" ? t("quote.student") : "—"}
                      {" · "}
                      {paper.presentationMode === "IN_PERSON" ? t("quote.inPerson") : paper.presentationMode === "ONLINE" ? t("quote.online") : "—"}
                      {paper.alreadyPaid ? ` · ✅ ${t("registration.paid")}` : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, color: "var(--text-muted)" }}>
              {t("registration.noAcceptedPapers")}
            </p>
          )}
        </div>
      </div>

      {!hasAcceptedPapers ? (
      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>{t("registration.listenerHeading")}</h3>
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
            {t("registration.listenerCheckbox")}
          </label>

          {listenerEnabled ? (
            <>
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
                    <span className="option-card-title">
                      {t(`registration.listenerTier.${entry.key}.label`)}
                    </span>
                    <span className="option-card-meta">
                      {t(`registration.listenerTier.${entry.key}.description`)}
                    </span>
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
      ) : null}

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="author-card">
          <h3>{t("registration.galaHeading")}</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="gala">{t("registration.attendanceLabel")}</label>
              <select
                id="gala"
                onChange={(event) => setGalaAttendance(event.target.value === "yes")}
                value={galaAttendance ? "yes" : "no"}
              >
                <option value="no">{t("registration.attendanceNo")}</option>
                <option value="yes">{t("registration.attendanceYes")}</option>
              </select>
              {config.gala.note ? (
                <span className="field-hint">{config.gala.note}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="author-card">
          <h3>{t("registration.tripHeading")}</h3>
          <div className="form-stack">
            <div className="field">
              <label htmlFor="trip">{t("registration.attendanceLabel")}</label>
              <select
                id="trip"
                onChange={(event) => setTripAttendance(event.target.value === "yes")}
                value={tripAttendance ? "yes" : "no"}
              >
                <option value="no">{t("registration.attendanceNo")}</option>
                <option value="yes">{t("registration.attendanceYes")}</option>
              </select>
              <span className="field-hint">{config.trip.note || t("quote.tripFree")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>{t("registration.summaryHeading")}</h3>
        <div className="quote-list">
          {computed.grandLines.map((line) => (
            <div className="quote-row" key={line.key}>
              <div>
                <strong>{line.label}</strong>
                {line.detail ? <p>{line.detail}</p> : null}
              </div>
              <span>
                {line.amount === 0
                  ? t("common.free")
                  : formatCurrencyAmount(line.amount, line.currency, locale)}
              </span>
            </div>
          ))}
        </div>
        <div className="quote-total">
          <span>{t("registration.receiptAmountRow")}</span>
          <strong>{formatCurrencyAmount(computed.paperTotal, computed.paperCurrency, locale)}</strong>
        </div>
      </div>

      <div className="grid two" style={{ marginTop: 18 }}>
        <div className="author-card">
          <h3>{t("registration.bankHeading")}</h3>
          <div className="form-stack">
            <div className="field">
              <label>{t("registration.bankName")}</label>
              <input readOnly value={config.bank.bankName || t("registration.notSpecified")} />
            </div>
            {config.bank.bankBranch ? (
              <div className="field">
                <label>{t("registration.bankBranch")}</label>
                <input readOnly value={config.bank.bankBranch} />
              </div>
            ) : null}
            <div className="field">
              <label>{t("registration.bankHolder")}</label>
              <input readOnly value={config.bank.bankAccountHolder || t("registration.notSpecified")} />
            </div>
            <div className="field">
              <label>{t("registration.bankIban")}</label>
              <input readOnly value={config.bank.bankIban || t("registration.notSpecified")} />
            </div>
          </div>
        </div>

        <div className="author-card">
          <h3>{t("registration.transferHeading")}</h3>
          <div className="form-stack">
            <div className="field">
              <label>{t("registration.transferLabel")}</label>
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
              {copiedDescription ? t("common.copied") : t("registration.copyDescription")}
            </button>
          </div>
        </div>
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
        <h3>{t("registration.receiptHeading")}</h3>
        <div className="form-stack">
          {needsReceipt ? (
            <div className="field">
              <label htmlFor="receipt">
                {t("registration.receiptUpload")} <span className="required">*</span>
              </label>
              <input
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                id="receipt"
                onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span className="field-hint">{t("registration.receiptHint")}</span>
            </div>
          ) : (
            <div className="notice" style={{ marginTop: 0 }}>
              {t("registration.noReceiptNeeded")}
            </div>
          )}
          <div className="field">
            <label htmlFor="student-document">{t("registration.studentDocLabel")}</label>
            <input
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              id="student-document"
              onChange={(event) => setStudentDocumentFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <span className="field-hint">{t("registration.studentDocHint")}</span>
          </div>
        </div>
      </div>

      <div className="author-card" style={{ marginTop: 18 }}>
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
          {loading ? t("common.saving") : t("registration.submit")}
        </button>
      </div>
    </form>
  );
}
