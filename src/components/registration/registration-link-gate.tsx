"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  congressSlug: string;
  isValid: boolean;
  token: string;
};

export function RegistrationLinkGate({ congressSlug, isValid, token }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isValid || !token) {
    return (
      <div>
        <div className="error">
          Bağlantı geçersiz ya da süresi dolmuş. Lütfen{" "}
          <Link href={`/${congressSlug}/kayit`} style={{ color: "var(--primary)", fontWeight: 600 }}>
            yeni bir bağlantı isteyin
          </Link>
          .
        </div>
      </div>
    );
  }

  async function handleVerify() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/registrations/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Bağlantı doğrulanamadı.");
      router.push(`/${congressSlug}/kayit/panel`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Beklenmeyen bir hata oluştu.");
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="flow-intro">
        Bağlantınızı doğrulayıp kayıt panelinizi açacağız. Aynı cihazda 5 dakika içinde işlemlerinizi
        sürdürebilirsiniz.
      </p>
      {error ? <div className="error">{error}</div> : null}
      <div className="form-actions">
        <Link className="button secondary" href={`/${congressSlug}/kayit`}>
          Yeni Bağlantı İste
        </Link>
        <button className="button primary" disabled={loading} onClick={handleVerify} type="button">
          {loading ? "Doğrulanıyor..." : "Kayıt Paneline Geç"}
        </button>
      </div>
    </div>
  );
}
