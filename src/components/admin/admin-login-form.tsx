"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Giriş başarısız.");
      }

      router.push("/admin/bildiriler");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Giriş başarısız.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card admin-login-card" onSubmit={handleSubmit}>
      <h2 className="section-title">Yönetim Girişi</h2>
      <div className="field">
        <label htmlFor="admin-password">Admin Şifresi</label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Şifrenizi girin"
          autoComplete="current-password"
          required
        />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="form-actions admin-login-actions">
        <button className="button primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Giriş yapılıyor..." : "Panele Gir"}
        </button>
      </div>
    </form>
  );
}
