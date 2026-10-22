'use client';

import { useState } from 'react';
import { browserSupabase } from '@/lib/supabase/browser';

export function AccountPanel({ email, displayName }: { email: string; displayName: string }) {
  const [name, setName] = useState(displayName);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setSaved(null);
    setErr(null);
    const res = await fetch('/api/account', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ displayName: name }) });
    const j = (await res.json()) as { ok: boolean; message?: string };
    if (j.ok) setSaved('Saved.');
    else setErr(j.message ?? 'Could not save.');
  }

  async function signOut() {
    await browserSupabase()?.auth.signOut();
    window.location.href = '/';
  }

  async function deleteAccount() {
    setBusy(true);
    setErr(null);
    const res = await fetch('/api/account', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ confirm }) });
    const j = (await res.json()) as { ok: boolean; message?: string };
    if (!j.ok) {
      setBusy(false);
      return setErr(j.message ?? 'Could not delete the account.');
    }
    await browserSupabase()?.auth.signOut().catch(() => undefined);
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('unsealed:')) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
    window.location.href = '/?deleted=1';
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-1">
        <h2 className="font-mono text-[11px] tracking-[0.15em] text-faint">SIGNED IN AS</h2>
        <p className="text-lg font-bold">{email}</p>
      </section>

      <form onSubmit={saveName} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
          Detective name (shown to friends in co-op later)
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required
            className="h-12 rounded-xl border border-line bg-walnut px-4 text-base text-paper" />
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" className="h-11 rounded-xl bg-amber px-5 font-extrabold text-ink">Save name</button>
          {saved && <span role="status" className="text-sm text-green-text">{saved}</span>}
        </div>
      </form>

      <button type="button" onClick={signOut} className="h-12 rounded-xl border border-line-strong font-extrabold">Sign out</button>

      <section className="flex flex-col gap-3 rounded-2xl border border-red/60 p-4">
        <h2 className="font-extrabold text-red-soft">Delete account</h2>
        <p className="text-sm text-body">This permanently deletes your account, saved cases and Daily results. It can’t be undone.</p>
        <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted">
          Type DELETE to confirm
          <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off"
            className="h-11 rounded-xl border border-line bg-walnut px-4 font-mono text-paper" />
        </label>
        <button type="button" disabled={confirm !== 'DELETE' || busy} onClick={deleteAccount}
          className="h-11 rounded-xl bg-red font-extrabold text-paper disabled:opacity-40">
          {busy ? 'Deleting…' : 'Delete my account'}
        </button>
      </section>

      {err && <p role="alert" className="text-sm font-semibold text-red-soft">{err}</p>}
    </div>
  );
}
