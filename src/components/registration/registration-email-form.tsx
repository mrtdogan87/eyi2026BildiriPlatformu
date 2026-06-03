"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useT } from "@/lib/i18n/provider";

type Props = {
  congressSlug: string;
};

export function RegistrationEmailForm({ congressSlug }: Props) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [magicLinkPreview, setMagicLinkPreview] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setMagicLinkPreview("");
    setError("");

    try {
      const response = await fetch("/api/registrations/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ congressSlug, email }),
      });
      const data = (await response.json()) as {
        message?: string;
        magicLinkPreview?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? t("errors.linkSendFailed"));
      }
      setMessage(data.message ?? "");
      if (data.magicLinkPreview) setMagicLinkPreview(data.magicLinkPreview);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="submission-form-panel" onSubmit={handleSubmit}>
      <div className="grid two">
        <div className="field">
          <label htmlFor="registration-email">
            {t("common.email")} <span className="required">*</span>
          </label>
          <input
            id="registration-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("registration.emailPlaceholder")}
            required
          />
          <span className="field-hint">{t("registration.emailHint")}</span>
        </div>
      </div>

      <div className="form-actions">
        <div>
          {message ? <div className="notice">{message}</div> : null}
          {magicLinkPreview ? (
            <div className="magic-preview">
              <strong>{t("registration.previewTitle")}</strong>
              <p>{t("registration.previewDesc")}</p>
              <a className="button primary" href={magicLinkPreview}>
                {t("registration.openPanel")}
              </a>
            </div>
          ) : null}
          {error ? <div className="error">{error}</div> : null}
        </div>
        <button className="button primary" disabled={loading} type="submit">
          {loading ? t("common.sending") : t("registration.sendLink")}
        </button>
      </div>
    </form>
  );
}
