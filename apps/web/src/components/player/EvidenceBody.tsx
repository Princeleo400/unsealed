import type { Evidence } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal markdown for our own case documents: **bold**, *italic*, "- " lists, paragraphs. Input is escaped first. */
export function mdToHtml(src: string): string {
  const inline = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  return src
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => l.startsWith('- '))) return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

function Table({ cols, rows, highlight }: { cols: string[]; rows: string[][]; highlight?: (r: string[]) => boolean }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse font-mono text-[13px]">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} scope="col" className="border-b-2 border-ink px-1 py-1.5 text-left font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={highlight?.(r) ? 'bg-amber-wash' : undefined}>
              {r.map((c, j) => (
                <td key={j} className="border-b border-paper-line px-1 py-1.5 align-top">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chat({ thread, messages, note }: { thread: string; messages: { from: string; at: string; text: string; me?: boolean }[]; note?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-extrabold">{thread}</div>
      {messages.map((m, i) => (
        <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.me ? 'ml-auto bg-[#DCEBDD]' : 'bg-[#EFE6D6]'}`}>
          <div className="text-[11px] font-extrabold text-[#3a2f27]">{m.from}</div>
          <div>{m.text}</div>
          <div className="text-right font-mono text-[10px] text-[#5c4f42]">{m.at}</div>
        </div>
      ))}
      {note && <p className="text-xs text-[#4a3f35]">{note}</p>}
    </div>
  );
}

export function EvidenceBody({ e, view }: { e: Evidence; view: CaseView }) {
  const b = e.body;
  switch (b.type) {
    case 'document':
      return <div className="doc text-[15px] leading-relaxed" dangerouslySetInnerHTML={{ __html: mdToHtml(b.markdown) }} />;
    case 'photo':
      return (
        <figure className="m-0 flex flex-col gap-3">
          <div className="relative rounded border border-dashed border-[#8a7c69] bg-[#ece2d0] p-4">
            <span className="font-mono text-[10px] tracking-widest text-[#5c4f42]">SCENE DESCRIPTION · ILLUSTRATION COMING</span>
            <p className="mt-2 text-[15px] leading-relaxed">{b.scene}</p>
            {b.stamp && <span className="mt-2 block text-right font-mono text-xs text-[#8a5a00]">{b.stamp}</span>}
          </div>
          <figcaption className="text-sm italic">{b.caption}</figcaption>
          {b.markers && (
            <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {b.markers.map((m) => (
                <li key={m.n} className="flex gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-amber text-[11px] font-extrabold text-ink">{m.n}</span>
                  {m.label}
                </li>
              ))}
            </ol>
          )}
        </figure>
      );
    case 'chat':
      return <Chat thread={b.thread} messages={b.messages} note={b.note} />;
    case 'log':
      return (
        <div className="flex flex-col gap-2">
          {b.header && <div className="font-mono text-[11px] tracking-widest text-[#4a3f35]">{b.header}</div>}
          {b.intro && <p className="text-sm">{b.intro}</p>}
          <Table cols={b.columns} rows={b.rows} />
          {b.footnote && <p className="text-xs leading-relaxed text-[#4a3f35]">{b.footnote}</p>}
        </div>
      );
    case 'handwriting':
      return (
        <div className="flex flex-col gap-3">
          {b.entries.map((x, i) => (
            <p key={i} className="m-0 text-lg italic" style={{ color: x.ink }}>
              {x.text}
              {x.signedBy ? ` — ${x.signedBy}` : ''} <span className="sr-only">(ink: {x.ink})</span>
            </p>
          ))}
          {b.note && <p className="text-xs">{b.note}</p>}
        </div>
      );
    case 'receipt':
      return (
        <div className="max-w-sm border border-dashed border-[#8a7c69] bg-white p-4 font-mono text-[13px]">
          <div className="font-semibold">{b.merchant}</div>
          {b.lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          <div className="mt-2 text-[#5c4f42]">{b.at}</div>
          {b.note && <p className="mt-2 font-sans text-xs">{b.note}</p>}
        </div>
      );
    case 'map': {
      const label = (id: string) => b.points.find((p) => p.id === id)?.label ?? id;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{b.description}</p>
          <Table cols={['From', 'To', 'Time']} rows={b.travel.map((t) => [label(t.from), label(t.to), `${t.minutes} min by ${t.mode}`])} />
        </div>
      );
    }
    case 'statement': {
      const s = view.case.suspects.find((x) => x.id === b.suspectId);
      return (
        <p className="text-xs text-[#4a3f35]">
          {s?.name} · {s?.role} · interviewed {b.interviewedAt}
        </p>
      );
    }
    case 'audio':
      return (
        <div className="flex flex-col gap-2">
          <Table cols={['Time', 'Speaker', 'Words']} rows={b.lines.map((l) => [l.t, l.speaker, l.text])} />
          {b.note && <p className="text-xs">{b.note}</p>}
        </div>
      );
    case 'phone':
      return (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h4 className="font-mono text-[11px] tracking-widest text-[#4a3f35]">MESSAGES</h4>
            {b.messages.map((t) => (
              <Chat key={t.thread} thread={t.thread} messages={t.messages} />
            ))}
          </section>
          {b.calls.length > 0 && (
            <section>
              <h4 className="mb-1 font-mono text-[11px] tracking-widest text-[#4a3f35]">CALLS</h4>
              <Table cols={['Time', 'Who', 'Type', 'Length']} rows={b.calls.map((c) => [c.at, c.who, c.dir, c.duration])} />
            </section>
          )}
          {b.notes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h4 className="font-mono text-[11px] tracking-widest text-[#4a3f35]">NOTES</h4>
              {b.notes.map((n) => (
                <div key={n.title} className="rounded bg-[#efe6d6] p-3 text-sm">
                  <div className="font-extrabold">{n.title}</div>
                  {n.text}
                </div>
              ))}
            </section>
          )}
          {b.health.length > 0 && (
            <section>
              <h4 className="mb-1 font-mono text-[11px] tracking-widest text-[#4a3f35]">HEALTH · WATCH HEART RATE</h4>
              <Table cols={['Time', 'Heart rate']} rows={b.health.map((h) => [h.t, h.bpm ? `${h.bpm} bpm` : 'no pulse detected'])} />
            </section>
          )}
        </div>
      );
  }
}
