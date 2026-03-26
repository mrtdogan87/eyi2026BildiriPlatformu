"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

type Props = {
  submissionId: string;
  currentStatus: "SUBMITTED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED";
};

export function AdminStatusForm({ submissionId, currentStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/submissions/${submissionId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          note,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Durum güncellenemedi.");
      }

      setNote("");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Durum güncellenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="admin-status-form" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="status">Durum</label>
        <select id="status" value={status} onChange={(event) => setStatus(event.target.value as Props["currentStatus"])}>
          <option value="SUBMITTED">Gönderildi</option>
          <option value="UNDER_REVIEW">İncelemede</option>
          <option value="ACCEPTED">Kabul Edildi</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="status-note">Not</label>
        <textarea
          id="status-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="İsteğe bağlı yönetim notu"
        />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Kaydediliyor..." : "Durumu Güncelle"}
      </button>
    </form>
  );
}
