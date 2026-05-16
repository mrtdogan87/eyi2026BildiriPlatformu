"use client";

import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  congressSlug: string;
};

export function RegistrationEmailForm({ congressSlug }: Props) {
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
        throw new Error(data.error ?? "Kayıt linki gönderilemedi.");
      }
      setMessage(data.message ?? "");
      if (data.magicLinkPreview) setMagicLinkPreview(data.magicLinkPreview);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="submission-form-panel" onSubmit={handleSubmit}>
      <div className="grid two">
        <div className="field">
          <label htmlFor="registration-email">
            E-posta <span className="required">*</span>
          </label>
          <input
            id="registration-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ornek@universite.edu.tr"
            required
          />
          <span className="field-hint">
            Bildiri gönderdiyseniz yazar e-postanızı; dinleyici olarak kaydolacaksanız iletişim
            e-postanızı girin.
          </span>
        </div>
      </div>

      <div className="form-actions">
        <div>
          {message ? <div className="notice">{message}</div> : null}
          {magicLinkPreview ? (
            <div className="magic-preview">
              <strong>Test için oluşturulan erişim linki</strong>
              <p>
                Gerçek e-posta servisi bağlı olmadığı için bu link ekranda gösteriliyor.
                Tıklayarak kayıt panelini açabilirsiniz.
              </p>
              <a className="button primary" href={magicLinkPreview}>
                Kayıt Panelini Aç
              </a>
            </div>
          ) : null}
          {error ? <div className="error">{error}</div> : null}
        </div>
        <button className="button primary" disabled={loading} type="submit">
          {loading ? "Gönderiliyor..." : "Bağlantı Gönder"}
        </button>
      </div>
    </form>
  );
}
