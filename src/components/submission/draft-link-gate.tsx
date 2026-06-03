"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n/provider";

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
    throw new Error("server_no_response");
  }
}

export function DraftLinkGate({ congressSlug, token, isValid, windowMinutes }: Props) {
  const router = useRouter();
  const t = useT();
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
        throw new Error((data.error as string | undefined) ?? t("errors.draftVerifyFailed"));
      }

      const submissionId = (data.submission as { id?: string } | undefined)?.id;
      if (!submissionId) {
        throw new Error(t("errors.draftInfoFailed"));
      }

      router.push(`/${congressSlug}/bildiri-gonder?draft=${submissionId}`);
      router.refresh();
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "";
      setError(
        message === "server_no_response"
          ? t("errors.serverNoResponse")
          : message || t("errors.draftVerifyUnexpected"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="submission-form-panel">
      <p className="flow-intro">{t("submission.draftGateIntro", { minutes: windowMinutes })}</p>

      {!token ? <div className="error">{t("submission.draftGateNoToken")}</div> : null}

      {token && !isValid ? (
        <div className="error">{t("submission.draftGateInvalid")}</div>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      <div className="form-actions">
        <Link className="button secondary" href={`/${congressSlug}/bildiri-gonder`}>
          {t("submission.backToStart")}
        </Link>
        <button
          className="button primary"
          disabled={loading || !token || !isValid}
          onClick={handleContinue}
          type="button"
        >
          {loading ? t("common.verifying") : t("submission.continueDraftTitle")}
        </button>
      </div>
    </div>
  );
}
