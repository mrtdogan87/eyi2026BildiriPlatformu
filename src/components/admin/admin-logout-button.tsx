"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/admin/logout", {
        method: "POST",
      });
    } finally {
      router.push("/admin");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button className="button ghost" type="button" onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "Çıkış yapılıyor..." : "Çıkış Yap"}
    </button>
  );
}
