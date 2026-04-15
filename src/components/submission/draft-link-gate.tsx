"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  congressSlug: string;
  token: string;
  isValid: boolean;
  windowMinutes: number;
};

async function readResponsePayload(response: Response) {
  const text = await response.text();
  if (!text) {
    return {} as Record<string, unknown>;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("Sunucudan beklenen yanıt alınamadı. Lütfen tekrar deneyin.");
  }
}

export function DraftLinkGate({ congressSlug, token, isValid, windowMinutes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!isValid || !token) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/submissions/drafts/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await readResponsePayload(response);
      if (!response.ok) {
        throw new Error(
          (data.error as string | undefined) ??
            "Taslak bağlantısı doğrulanamadı. Lütfen e-postadaki linki yeniden açın.",
        );
      }

      const submissionId = (data.submission as { id?: string } | undefined)?.id;
      if (!submissionId) {
        throw new Error("Taslak bilgisi alınamadı. Lütfen tekrar deneyin.");
      }

      router.push(`/${congressSlug}/bildiri-gonder?draft=${submissionId}`);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Taslak bağlantısı doğrulanırken beklenmeyen bir hata oluştu.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="submission-form-panel">
      <p style={{ marginTop: 0, color: "#617089", lineHeight: 1.7 }}>
        Kurumsal e-posta sistemleri bağlantıları bazen ön kontrol için açabildiğinden, taslağınıza
        geçmeden önce bu ekranda onay alıyoruz. Devam ettiğinizde bağlantı aynı cihazda{" "}
        {windowMinutes} dakika boyunca geçerli kalır.
      </p>

      {!token ? (
        <div className="error">Erişim bağlantısında gerekli doğrulama bilgisi bulunamadı.</div>
      ) : null}

      {token && !isValid ? (
        <div className="error">
          Bu bağlantı geçersiz, süresi dolmuş veya daha önce kullanım süresi tamamlanmış görünüyor.
          Yeni bir taslak bağlantısı oluşturup tekrar deneyebilirsiniz.
        </div>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      <div className="form-actions">
        <Link className="button secondary" href={`/${congressSlug}/bildiri-gonder`}>
          Başlangıç Ekranına Dön
        </Link>
        <button
          className="button primary"
          disabled={loading || !token || !isValid}
          onClick={handleContinue}
          type="button"
        >
          {loading ? "Doğrulanıyor..." : "Taslağa Devam Et"}
        </button>
      </div>
    </div>
  );
}
