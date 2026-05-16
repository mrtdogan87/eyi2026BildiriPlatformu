"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  registrationId: string;
  registrationEmail: string;
};

const CONFIRMATION_PHRASE = "Bu kaydı silmeyi onaylıyorum";

export function AdminDeleteRegistration({ registrationId, registrationEmail }: Props) {
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
      const response = await fetch(`/api/admin/registrations/${registrationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Kayıt silinemedi.");
      }

      router.push("/admin/kayitlar");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Kayıt silinemedi.");
      setIsDeleting(false);
    }
  }

  return (
    <form className="admin-danger-form" onSubmit={handleSubmit}>
      <p className="admin-danger-lead">
        <strong>{registrationEmail}</strong> e-postası için yapılmış bu kayıt kalıcı olarak silinecek.
        Ödeme dekontu, gala/gezi tercihleri ve bildiri eşleştirmeleri tamamen kaldırılır. Bildiri
        yazarı tekrar kayıt sayfasından yeni bir ödeme yapabilir. Bu işlem geri alınamaz.
      </p>
      <div className="field">
        <label htmlFor="delete-registration-confirmation">
          Onaylamak için aşağıdaki ifadeyi birebir yazın
        </label>
        <input
          autoComplete="off"
          id="delete-registration-confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder={CONFIRMATION_PHRASE}
          spellCheck={false}
          type="text"
          value={confirmation}
        />
        <span className="field-hint">İfade: &quot;{CONFIRMATION_PHRASE}&quot;</span>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button className="button danger" disabled={!matches || isDeleting} type="submit">
        {isDeleting ? "Siliniyor..." : "Kaydı Kalıcı Olarak Sil"}
      </button>
    </form>
  );
}
