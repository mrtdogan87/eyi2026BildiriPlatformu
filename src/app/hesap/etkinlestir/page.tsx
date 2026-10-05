import { Suspense } from 'react';
import { ActivationForm } from '@/components/admin/platform-controls';
export default function ActivatePage() { return <main className="page-shell"><Suspense fallback={<p>Yükleniyor…</p>}><ActivationForm /></Suspense></main>; }
