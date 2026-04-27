"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdminCongressSettings,
  AdminPaymentTier,
  AdminPricingPayload,
} from "@/types/admin";

type Props = {
  initialPayload: AdminPricingPayload;
};

type SettingsDraft = {
  earlyDeadline: string;
  lateDeadline: string;
  galaFeeAmount: string;
  galaFeeCurrency: string;
  galaFeeNote: string;
  bankName: string;
  bankAccountHolder: string;
  bankIban: string;
  bankBranch: string;
  tripNote: string;
};

type TierDraft = {
  amount: string;
  currency: string;
  active: boolean;
  saving: boolean;
  message: string;
  error: string;
};

type TierGroup = {
  key: string;
  title: string;
  description: string;
  rows: AdminPaymentTier[];
};

const PERIOD_LABELS: Record<string, string> = {
  EARLY: "Erken Kayıt",
  LATE: "Geç Kayıt",
};

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60_000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string): string | null {
  if (!value) return null;
  const local = new Date(value);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

function settingsToDraft(settings: AdminCongressSettings): SettingsDraft {
  return {
    earlyDeadline: toLocalInputValue(settings.earlyDeadline),
    lateDeadline: toLocalInputValue(settings.lateDeadline),
    galaFeeAmount: String(settings.galaFeeAmount ?? 0),
    galaFeeCurrency: settings.galaFeeCurrency ?? "EUR",
    galaFeeNote: settings.galaFeeNote ?? "",
    bankName: settings.bankName ?? "",
    bankAccountHolder: settings.bankAccountHolder ?? "",
    bankIban: settings.bankIban ?? "",
    bankBranch: settings.bankBranch ?? "",
    tripNote: settings.tripNote ?? "",
  };
}

function tierToDraft(tier: AdminPaymentTier): TierDraft {
  return {
    amount: String(tier.amount),
    currency: tier.currency,
    active: tier.active,
    saving: false,
    message: "",
    error: "",
  };
}

function buildGroups(tiers: AdminPaymentTier[]): TierGroup[] {
  const groups = new Map<string, TierGroup>();

  for (const tier of tiers) {
    const key = [tier.presentationMode, tier.role, tier.audience ?? "ANY", tier.onlinePaperCount ?? "-"].join("|");
    if (!groups.has(key)) {
      const title = buildGroupTitle(tier);
      const description = buildGroupDescription(tier);
      groups.set(key, { key, title, description, rows: [] });
    }
    groups.get(key)!.rows.push(tier);
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    rows: group.rows.sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

function buildGroupTitle(tier: AdminPaymentTier): string {
  if (tier.presentationMode === "IN_PERSON") {
    const audience =
      tier.audience === "ACADEMIC" ? "Akademisyen" : tier.audience === "STUDENT" ? "Öğrenci" : "";
    const role = tier.role === "PRESENTER" ? "Sunumlu" : "Dinleyici";
    return `Yüz Yüze · ${audience} · ${role}`;
  }

  if (tier.role === "LISTENER") {
    return "Çevrim İçi · Dinleyici";
  }

  if (tier.onlinePaperCount === 2) {
    return "Çevrim İçi · İki Bildiri";
  }

  return "Çevrim İçi · Tek Bildiri";
}

function buildGroupDescription(tier: AdminPaymentTier): string {
  if (tier.presentationMode === "IN_PERSON") {
    return "Erken ve geç kayıt fiyatları otomatik olarak kayıt tarihlerine göre uygulanır.";
  }

  if (tier.role === "LISTENER") {
    return "Çevrim içi dinleyici katılımı ücretsiz olabilir; tutar 0 girilirse dekont istenmez.";
  }

  return "Çevrim içi sunum için tek tutar uygulanır, erken/geç ayrımı yoktur.";
}

function rowLabel(tier: AdminPaymentTier): string {
  if (tier.period) {
    return PERIOD_LABELS[tier.period] ?? tier.period;
  }
  if (tier.presentationMode === "ONLINE" && tier.role === "PRESENTER") {
    return tier.onlinePaperCount === 2 ? "İki Bildiri" : "Tek Bildiri";
  }
  return "Tek Tutar";
}

export function PricingManager({ initialPayload }: Props) {
  const [payload, setPayload] = useState<AdminPricingPayload>(initialPayload);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>(() =>
    settingsToDraft(initialPayload.congress),
  );
  const [tierDrafts, setTierDrafts] = useState<Record<string, TierDraft>>(() => {
    const map: Record<string, TierDraft> = {};
    for (const tier of initialPayload.tiers) {
      map[tier.id] = tierToDraft(tier);
    }
    return map;
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    setSettingsDraft(settingsToDraft(payload.congress));
    setTierDrafts((prev) => {
      const next: Record<string, TierDraft> = {};
      for (const tier of payload.tiers) {
        const existing = prev[tier.id];
        next[tier.id] = existing
          ? {
              ...existing,
              amount: String(tier.amount),
              currency: tier.currency,
              active: tier.active,
              saving: false,
            }
          : tierToDraft(tier);
      }
      return next;
    });
  }, [payload]);

  const tierGroups = useMemo(() => buildGroups(payload.tiers), [payload.tiers]);

  function updateTierDraft(id: string, patch: Partial<TierDraft>) {
    setTierDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  async function handleTierSave(tier: AdminPaymentTier) {
    const draft = tierDrafts[tier.id];
    if (!draft) return;

    const numericAmount = Number(draft.amount.replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      updateTierDraft(tier.id, { error: "Tutar 0 ve üzeri bir sayı olmalıdır.", message: "" });
      return;
    }

    updateTierDraft(tier.id, { saving: true, error: "", message: "" });

    try {
      const response = await fetch(`/api/admin/payment-tiers/${tier.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          currency: draft.currency,
          active: draft.active,
        }),
      });

      const data = (await response.json()) as { pricing?: AdminPricingPayload; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Tutar güncellenemedi.");
      }

      if (data.pricing) {
        setPayload(data.pricing);
      }
      updateTierDraft(tier.id, { saving: false, message: "Kaydedildi", error: "" });
    } catch (error) {
      updateTierDraft(tier.id, {
        saving: false,
        error: error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.",
        message: "",
      });
    }
  }

  async function handleSettingsSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingSettings(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      const galaAmount = Number(settingsDraft.galaFeeAmount.replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(galaAmount) || galaAmount < 0) {
        throw new Error("Gala ücreti 0 ve üzeri bir sayı olmalıdır.");
      }

      const response = await fetch("/api/admin/congress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          earlyDeadline: fromLocalInputValue(settingsDraft.earlyDeadline),
          lateDeadline: fromLocalInputValue(settingsDraft.lateDeadline),
          galaFeeAmount: galaAmount,
          galaFeeCurrency: settingsDraft.galaFeeCurrency.trim().toUpperCase() || "EUR",
          galaFeeNote: settingsDraft.galaFeeNote,
          bankName: settingsDraft.bankName,
          bankAccountHolder: settingsDraft.bankAccountHolder,
          bankIban: settingsDraft.bankIban,
          bankBranch: settingsDraft.bankBranch,
          tripNote: settingsDraft.tripNote,
        }),
      });

      const data = (await response.json()) as { pricing?: AdminPricingPayload; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Kongre ayarları kaydedilemedi.");
      }
      if (data.pricing) {
        setPayload(data.pricing);
      }
      setSettingsMessage("Ayarlar kaydedildi.");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu.");
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="pricing-manager">
      <section className="pricing-section">
        <header className="pricing-section-head">
          <div>
            <h2>Kayıt Dönemleri ve Banka Bilgileri</h2>
            <p>
              Erken ve geç kayıt tarihlerini girin. Sistem, başvuru anına göre uygun fiyatı
              otomatik gösterir.
            </p>
            {payload.currentPeriod ? (
              <span className="pricing-pill pricing-pill-info">
                Şu an aktif dönem: {PERIOD_LABELS[payload.currentPeriod]}
              </span>
            ) : (
              <span className="pricing-pill pricing-pill-warn">
                Kayıt süresi sona erdi (geç kayıt tarihinden sonra).
              </span>
            )}
          </div>
        </header>

        <form className="pricing-grid" onSubmit={handleSettingsSave}>
          <div className="pricing-card">
            <h3>Tarihler</h3>
            <div className="field">
              <label htmlFor="earlyDeadline">Erken Kayıt Son Tarih</label>
              <input
                id="earlyDeadline"
                type="datetime-local"
                value={settingsDraft.earlyDeadline}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    earlyDeadline: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="lateDeadline">Geç Kayıt Son Tarih</label>
              <input
                id="lateDeadline"
                type="datetime-local"
                value={settingsDraft.lateDeadline}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    lateDeadline: event.target.value,
                  }))
                }
              />
              <span className="field-hint">
                Bu tarihten sonra başvuru ve ödeme alınmaz. Boş bırakılırsa kayıt süresiz açık kalır.
              </span>
            </div>
          </div>

          <div className="pricing-card">
            <h3>Gala Yemeği</h3>
            <div className="field">
              <label htmlFor="galaFeeAmount">Kişi Başı Gala Ücreti</label>
              <input
                id="galaFeeAmount"
                inputMode="numeric"
                value={settingsDraft.galaFeeAmount}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    galaFeeAmount: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="galaFeeCurrency">Para Birimi</label>
              <select
                id="galaFeeCurrency"
                value={settingsDraft.galaFeeCurrency}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    galaFeeCurrency: event.target.value,
                  }))
                }
              >
                <option value="EUR">EUR (€)</option>
                <option value="TRY">TRY (₺)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="galaFeeNote">Not</label>
              <input
                id="galaFeeNote"
                value={settingsDraft.galaFeeNote}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    galaFeeNote: event.target.value,
                  }))
                }
                placeholder="Örn. Gala yemeği için ek ücret kişi sayısı kadar alınır."
              />
            </div>
          </div>

          <div className="pricing-card">
            <h3>Banka Bilgileri</h3>
            <div className="field">
              <label htmlFor="bankName">Banka</label>
              <input
                id="bankName"
                value={settingsDraft.bankName}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    bankName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="bankBranch">Şube</label>
              <input
                id="bankBranch"
                value={settingsDraft.bankBranch}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    bankBranch: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="bankAccountHolder">Hesap Sahibi</label>
              <input
                id="bankAccountHolder"
                value={settingsDraft.bankAccountHolder}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    bankAccountHolder: event.target.value,
                  }))
                }
              />
            </div>
            <div className="field">
              <label htmlFor="bankIban">IBAN</label>
              <input
                id="bankIban"
                value={settingsDraft.bankIban}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    bankIban: event.target.value,
                  }))
                }
                placeholder="TR.."
              />
            </div>
          </div>

          <div className="pricing-card">
            <h3>Gezi Notu</h3>
            <div className="field">
              <label htmlFor="tripNote">Açıklama</label>
              <textarea
                id="tripNote"
                rows={4}
                value={settingsDraft.tripNote}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    tripNote: event.target.value,
                  }))
                }
                placeholder="Örn. Gezi ücretsizdir; serbest öğle yemeği zamanında bireysel olarak yapılır."
              />
            </div>
          </div>

          <div className="pricing-actions">
            {settingsMessage ? <span className="pricing-status-success">{settingsMessage}</span> : null}
            {settingsError ? <span className="pricing-status-error">{settingsError}</span> : null}
            <button className="button primary" disabled={savingSettings} type="submit">
              {savingSettings ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
          </div>
        </form>
      </section>

      <section className="pricing-section">
        <header className="pricing-section-head">
          <div>
            <h2>Ücret Tarifesi</h2>
            <p>
              Her kategori için tutar ve para birimi belirleyin. Pasif yapılan kayıt seçenekleri
              başvuru ekranında gizlenir.
            </p>
          </div>
        </header>

        <div className="pricing-tier-grid">
          {tierGroups.map((group) => (
            <article key={group.key} className="pricing-tier-card">
              <header>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </header>
              <div className="pricing-tier-rows">
                {group.rows.map((tier) => {
                  const draft = tierDrafts[tier.id];
                  if (!draft) return null;
                  return (
                    <div key={tier.id} className="pricing-tier-row">
                      <div className="pricing-tier-row-head">
                        <span className="pricing-tier-row-title">{rowLabel(tier)}</span>
                        <label className="pricing-tier-toggle">
                          <input
                            checked={draft.active}
                            onChange={(event) =>
                              updateTierDraft(tier.id, { active: event.target.checked })
                            }
                            type="checkbox"
                          />
                          Aktif
                        </label>
                      </div>
                      <div className="pricing-tier-row-fields">
                        <div className="field">
                          <label>Tutar</label>
                          <input
                            inputMode="numeric"
                            value={draft.amount}
                            onChange={(event) =>
                              updateTierDraft(tier.id, { amount: event.target.value })
                            }
                          />
                        </div>
                        <div className="field">
                          <label>Para Birimi</label>
                          <select
                            value={draft.currency}
                            onChange={(event) =>
                              updateTierDraft(tier.id, { currency: event.target.value })
                            }
                          >
                            <option value="TRY">TRY (₺)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                        </div>
                      </div>
                      <div className="pricing-tier-row-foot">
                        {draft.message ? (
                          <span className="pricing-status-success">{draft.message}</span>
                        ) : null}
                        {draft.error ? (
                          <span className="pricing-status-error">{draft.error}</span>
                        ) : null}
                        <button
                          className="button primary"
                          disabled={draft.saving}
                          onClick={() => handleTierSave(tier)}
                          type="button"
                        >
                          {draft.saving ? "Kaydediliyor..." : "Kaydet"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
