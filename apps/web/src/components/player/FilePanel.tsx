'use client';

import { useState } from 'react';
import type { Evidence } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';
import { IconSearch } from '@/components/icons';

const TABS: { id: Evidence['tab']; label: string }[] = [
  { id: 'documents', label: 'Documents' },
  { id: 'photos', label: 'Photos' },
  { id: 'records', label: 'Records' },
  { id: 'statements', label: 'Statements' },
  { id: 'phone', label: 'Phone' },
];

export function FilePanel({
  view,
  selectedId,
  pins,
  busy,
  onOpen,
  onLead,
  onSearch,
  lastSearch,
}: {
  view: CaseView;
  selectedId: string | null;
  pins: string[];
  busy: boolean;
  onOpen: (id: string) => void;
  onLead: (id: string) => void;
  onSearch: (query: string) => void;
  lastSearch: {
    query: string;
    results: { id: string; number: number; title: string }[];
  } | null;
}) {
  const [query, setQuery] = useState('');
  const [confirmLead, setConfirmLead] = useState<string | null>(null);
  const active = view.status === 'active';

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          if (query.trim()) onSearch(query.trim());
        }}
        className="flex flex-col gap-1.5"
      >
        <label
          htmlFor="archive-search"
          className="text-xs font-semibold text-muted"
        >
          {view.case.archive.label}
        </label>
        <div className="flex gap-2">
          <input
            id="archive-search"
            value={query}
            onChange={(ev) => setQuery(ev.target.value)}
            placeholder={view.case.archive.placeholder}
            disabled={!active}
            className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-walnut px-3 font-mono text-sm text-paper placeholder:font-sans placeholder:text-faint"
          />
          <button
            type="submit"
            disabled={busy || !active}
            aria-label="Search"
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber text-ink disabled:opacity-50"
          >
            <IconSearch />
          </button>
        </div>
        <p className="text-[11px] text-faint">
          Free. Exact names, codes and plates only.
        </p>
        {lastSearch && (
          <div
            role="status"
            className="mt-1 rounded-lg border border-line p-2 text-sm"
          >
            {lastSearch.results.length === 0 ? (
              <span className="text-muted">
                No records found for “{lastSearch.query}”.
              </span>
            ) : (
              lastSearch.results.map((evidenceBrief) => (
                <button
                  key={evidenceBrief.id}
                  type="button"
                  onClick={() => onOpen(evidenceBrief.id)}
                  className="block w-full rounded px-1 py-1 text-left hover:bg-walnut"
                >
                  <span className="font-mono text-xs text-amber">
                    {String(evidenceBrief.number).padStart(2, '0')}
                  </span>{' '}
                  {evidenceBrief.title}
                </button>
              ))
            )}
          </div>
        )}
      </form>

      {TABS.map((tab) => {
        const items = view.evidence
          .filter((evidence) => evidence.tab === tab.id)
          .sort((first, second) => first.number - second.number);
        if (!items.length) return null;
        return (
          <section key={tab.id} aria-label={tab.label}>
            <h3 className="mb-1 font-mono text-[11px] tracking-[0.15em] text-faint">
              {tab.label.toUpperCase()}
            </h3>
            <ul className="flex flex-col">
              {items.map((evidence) => {
                const unread = !view.read.includes(evidence.id);
                return (
                  <li key={evidence.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(evidence.id)}
                      aria-current={
                        selectedId === evidence.id ? 'true' : undefined
                      }
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                        selectedId === evidence.id
                          ? 'bg-walnut font-extrabold'
                          : 'hover:bg-walnut/60'
                      }`}
                    >
                      <span className="w-6 font-mono text-xs text-faint">
                        {String(evidence.number).padStart(2, '0')}
                      </span>
                      <span className="flex-1">{evidence.title}</span>
                      {pins.includes(evidence.id) && (
                        <span className="text-[10px] font-bold text-amber">
                          PINNED
                        </span>
                      )}
                      {unread && (
                        <span
                          className="h-2 w-2 rounded-full bg-amber"
                          aria-label="unread"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section aria-label="Leads">
        <h3 className="mb-1 font-mono text-[11px] tracking-[0.15em] text-faint">
          LEADS
        </h3>
        {view.leads.available.length === 0 && (
          <p className="px-2 text-sm text-muted">No open leads right now.</p>
        )}
        <ul className="flex flex-col gap-1.5">
          {view.leads.available.map((lead) => (
            <li key={lead.id}>
              {confirmLead === lead.id ? (
                <div className="rounded-lg border border-amber p-2.5 text-sm">
                  <p className="mb-2">
                    Follow “{lead.title}”? Adds <b>{lead.costHours} h</b> to the
                    clock.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        onLead(lead.id);
                        setConfirmLead(null);
                      }}
                      className="h-9 rounded-full bg-amber px-4 text-xs font-extrabold text-ink"
                    >
                      Follow lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmLead(null)}
                      className="h-9 rounded-full border border-line px-4 text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!active}
                  onClick={() => setConfirmLead(lead.id)}
                  className="w-full rounded-lg border border-dashed border-line-strong px-2.5 py-2 text-left text-sm hover:border-amber disabled:opacity-50"
                >
                  {lead.title}{' '}
                  <span className="text-faint">· {lead.costHours} h</span>
                </button>
              )}
            </li>
          ))}
        </ul>
        {view.leads.followed.length > 0 && (
          <p className="mt-2 px-2 text-xs text-faint">
            Followed:{' '}
            {view.leads.followed.map((lead) => lead.title).join(' · ')}
          </p>
        )}
      </section>
    </div>
  );
}
