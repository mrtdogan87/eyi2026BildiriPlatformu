"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {useAdminNavigation} from '@/components/admin-ui/navigation-guard';

export function AdminLogoutButton() {
  const router = useRouter();
  const {confirmLeave}=useAdminNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if(!await confirmLeave())return;
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
