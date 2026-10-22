import type { Evidence } from '@unsealed/engine';
import type { CaseView } from '@/lib/view-types';

const esc = (unsafeText: string) =>
  unsafeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal markdown for our own case documents: **bold**, *italic*, "- " lists, paragraphs. Input is escaped first. */
export function mdToHtml(src: string): string {
  const inline = (markdownText: string) =>
    esc(markdownText)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  return src
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => line.startsWith('- ')))
        return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('');
}

function Table({
  cols,
  rows,
  highlight,
}: {
  cols: string[];
  rows: string[][];
  highlight?: (row: string[]) => boolean;
}) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[320px] border-collapse font-mono text-[13px]">
        <thead>
          <tr>
            {cols.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b-2 border-ink px-1 py-1.5 text-left font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={index}
              className={highlight?.(row) ? 'bg-amber-wash' : undefined}
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-paper-line px-1 py-1.5 align-top"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chat({
  thread,
  messages,
  note,
}: {
  thread: string;
  messages: { from: string; at: string; text: string; me?: boolean }[];
  note?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-extrabold">{thread}</div>
      {messages.map((message, index) => (
        <div
          key={index}
          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${message.me ? 'ml-auto bg-[#DCEBDD]' : 'bg-[#EFE6D6]'}`}
        >
          <div className="text-[11px] font-extrabold text-[#3a2f27]">
            {message.from}
          </div>
          <div>{message.text}</div>
          <div className="text-right font-mono text-[10px] text-[#5c4f42]">
            {message.at}
          </div>
        </div>
      ))}
      {note && <p className="text-xs text-[#4a3f35]">{note}</p>}
    </div>
  );
}

export function EvidenceBody({
  evidence: evidence,
  view,
}: {
  evidence: Evidence;
  view: CaseView;
}) {
  const body = evidence.body;
  switch (body.type) {
    case 'document':
      return (
        <div
          className="doc text-[15px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: mdToHtml(body.markdown) }}
        />
      );
    case 'photo':
      return (
        <figure className="m-0 flex flex-col gap-3">
          <div className="relative rounded border border-dashed border-[#8a7c69] bg-[#ece2d0] p-4">
            <span className="font-mono text-[10px] tracking-widest text-[#5c4f42]">
              SCENE DESCRIPTION · ILLUSTRATION COMING
            </span>
            <p className="mt-2 text-[15px] leading-relaxed">{body.scene}</p>
            {body.stamp && (
              <span className="mt-2 block text-right font-mono text-xs text-[#8a5a00]">
                {body.stamp}
              </span>
            )}
          </div>
          <figcaption className="text-sm italic">{body.caption}</figcaption>
          {body.markers && (
            <ol className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {body.markers.map((marker) => (
                <li key={marker.n} className="flex gap-2">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-amber text-[11px] font-extrabold text-ink">
                    {marker.n}
                  </span>
                  {marker.label}
                </li>
              ))}
            </ol>
          )}
        </figure>
      );
    case 'chat':
      return (
        <Chat thread={body.thread} messages={body.messages} note={body.note} />
      );
    case 'log':
      return (
        <div className="flex flex-col gap-2">
          {body.header && (
            <div className="font-mono text-[11px] tracking-widest text-[#4a3f35]">
              {body.header}
            </div>
          )}
          {body.intro && <p className="text-sm">{body.intro}</p>}
          <Table cols={body.columns} rows={body.rows} />
          {body.footnote && (
            <p className="text-xs leading-relaxed text-[#4a3f35]">
              {body.footnote}
            </p>
          )}
        </div>
      );
    case 'handwriting':
      return (
        <div className="flex flex-col gap-3">
          {body.entries.map((handwrittenEntry, index) => (
            <p
              key={index}
              className="m-0 text-lg italic"
              style={{ color: handwrittenEntry.ink }}
            >
              {handwrittenEntry.text}
              {handwrittenEntry.signedBy
                ? ` — ${handwrittenEntry.signedBy}`
                : ''}{' '}
              <span className="sr-only">(ink: {handwrittenEntry.ink})</span>
            </p>
          ))}
          {body.note && <p className="text-xs">{body.note}</p>}
        </div>
      );
    case 'receipt':
      return (
        <div className="max-w-sm border border-dashed border-[#8a7c69] bg-white p-4 font-mono text-[13px]">
          <div className="font-semibold">{body.merchant}</div>
          {body.lines.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
          <div className="mt-2 text-[#5c4f42]">{body.at}</div>
          {body.note && <p className="mt-2 font-sans text-xs">{body.note}</p>}
        </div>
      );
    case 'map': {
      const label = (id: string) =>
        body.points.find((point) => point.id === id)?.label ?? id;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-sm">{body.description}</p>
          <Table
            cols={['From', 'To', 'Time']}
            rows={body.travel.map((route) => [
              label(route.from),
              label(route.to),
              `${route.minutes} min by ${route.mode}`,
            ])}
          />
        </div>
      );
    }
    case 'statement': {
      const suspect = view.case.suspects.find(
        (suspect) => suspect.id === body.suspectId,
      );
      return (
        <p className="text-xs text-[#4a3f35]">
          {suspect?.name} · {suspect?.role} · interviewed {body.interviewedAt}
        </p>
      );
    }
    case 'audio':
      return (
        <div className="flex flex-col gap-2">
          <Table
            cols={['Time', 'Speaker', 'Words']}
            rows={body.lines.map((audioLine) => [
              audioLine.t,
              audioLine.speaker,
              audioLine.text,
            ])}
          />
          {body.note && <p className="text-xs">{body.note}</p>}
        </div>
      );
    case 'phone':
      return (
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-4">
            <h4 className="font-mono text-[11px] tracking-widest text-[#4a3f35]">
              MESSAGES
            </h4>
            {body.messages.map((thread) => (
              <Chat
                key={thread.thread}
                thread={thread.thread}
                messages={thread.messages}
              />
            ))}
          </section>
          {body.calls.length > 0 && (
            <section>
              <h4 className="mb-1 font-mono text-[11px] tracking-widest text-[#4a3f35]">
                CALLS
              </h4>
              <Table
                cols={['Time', 'Who', 'Type', 'Length']}
                rows={body.calls.map((call) => [
                  call.at,
                  call.who,
                  call.dir,
                  call.duration,
                ])}
              />
            </section>
          )}
          {body.notes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h4 className="font-mono text-[11px] tracking-widest text-[#4a3f35]">
                NOTES
              </h4>
              {body.notes.map((note) => (
                <div
                  key={note.title}
                  className="rounded bg-[#efe6d6] p-3 text-sm"
                >
                  <div className="font-extrabold">{note.title}</div>
                  {note.text}
                </div>
              ))}
            </section>
          )}
          {body.health.length > 0 && (
            <section>
              <h4 className="mb-1 font-mono text-[11px] tracking-widest text-[#4a3f35]">
                HEALTH · WATCH HEART RATE
              </h4>
              <Table
                cols={['Time', 'Heart rate']}
                rows={body.health.map((reading) => [
                  reading.t,
                  reading.bpm ? `${reading.bpm} bpm` : 'no pulse detected',
                ])}
              />
            </section>
          )}
        </div>
      );
  }
}
