"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  submissionId: string;
  submissionTitle: string;
};

const CONFIRMATION_PHRASE = "Bu bildiriyi silmeyi onaylıyorum";

export function AdminDeleteSubmission({ submissionId, submissionTitle }: Props) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const matches = confirmation.trim() === CONFIRMATION_PHRASE;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;

    setError("");
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Bildiri silinemedi.");
      }

      router.push("/admin/bildiriler");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Bildiri silinemedi.");
      setIsDeleting(false);
    }
  }

  return (
    <form className="admin-danger-form" onSubmit={handleSubmit}>
      <p className="admin-danger-lead">
        <strong>{submissionTitle || "Bu bildiri"}</strong> kalıcı olarak silinecek. Bildiri,
        yazarları, yüklenen dosyalar, dekont ve durum geçmişi tamamen kaldırılır. Bu işlem
        geri alınamaz.
      </p>
      <div className="field">
        <label htmlFor="delete-confirmation">
          Onaylamak için aşağıdaki ifadeyi birebir yazın
        </label>
        <input
          autoComplete="off"
          id="delete-confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={CONFIRMATION_PHRASE}
          spellCheck={false}
          type="text"
          value={confirmation}
        />
        <span className="field-hint">İfade: &quot;{CONFIRMATION_PHRASE}&quot;</span>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button
        className="button danger"
        disabled={!matches || isDeleting}
        type="submit"
      >
        {isDeleting ? "Siliniyor..." : "Bildiriyi Kalıcı Olarak Sil"}
      </button>
    </form>
  );
}
