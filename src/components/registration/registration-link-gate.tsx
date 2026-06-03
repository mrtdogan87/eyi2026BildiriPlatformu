"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";

type Props = {
  congressSlug: string;
  isValid: boolean;
  token: string;
};

export function RegistrationLinkGate({ congressSlug, isValid, token }: Props) {
  const router = useRouter();
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isValid || !token) {
    return (
      <div>
        <div className="error">
          {t("registration.gateInvalidPrefix")}{" "}
          <Link href={`/${congressSlug}/kayit`} style={{ color: "var(--primary)", fontWeight: 600 }}>
            {t("registration.gateInvalidLink")}
          </Link>
          {t("registration.gateInvalidSuffix")}
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
      if (!response.ok) throw new Error(data.error ?? t("errors.linkVerifyFailed"));
      router.push(`/${congressSlug}/kayit/panel`);
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t("errors.unexpected"));
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="flow-intro">{t("registration.gateIntro")}</p>
      {error ? <div className="error">{error}</div> : null}
      <div className="form-actions">
        <Link className="button secondary" href={`/${congressSlug}/kayit`}>
          {t("registration.requestNewLink")}
        </Link>
        <button className="button primary" disabled={loading} onClick={handleVerify} type="button">
          {loading ? t("common.verifying") : t("registration.toPanelTitle")}
        </button>
      </div>
    </div>
  );
}
