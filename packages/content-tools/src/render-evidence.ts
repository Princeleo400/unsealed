import type { CasePublic, Evidence } from '@unsealed/engine';

export const esc = (unsafeText: string) =>
  unsafeText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Tiny markdown: **bold**, *italic*, "- " lists, blank-line paragraphs. Enough for case documents. */
export function md(src: string): string {
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

const table = (cols: string[], rows: string[][]) =>
  `<table><thead><tr>${cols.map((column) => `<th>${esc(column)}</th>`).join('')}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`,
    )
    .join('')}</tbody></table>`;

export function renderBody(evidence: Evidence, pub: CasePublic): string {
  const body = evidence.body;
  switch (body.type) {
    case 'document':
      return `<div class="doc">${md(body.markdown)}</div>`;
    case 'photo':
      return `<div class="photo"><div class="frame"><span class="tag">ILLUSTRATION</span><p>${esc(body.scene)}</p>${
        body.stamp ? `<span class="stamp">${esc(body.stamp)}</span>` : ''
      }</div><p class="caption">${esc(body.caption)}</p>${
        body.markers?.length
          ? `<ol class="markers">${body.markers.map((marker) => `<li><b>${marker.n}</b> ${esc(marker.label)}</li>`).join('')}</ol>`
          : ''
      }</div>`;
    case 'chat':
      return `<div class="chat"><div class="thread">${esc(body.thread)}</div>${body.messages
        .map(
          (message) =>
            `<div class="msg ${message.me ? 'me' : ''}"><span class="who">${esc(message.from)}</span>${esc(message.text)}<span class="at">${esc(message.at)}</span></div>`,
        )
        .join(
          '',
        )}${body.note ? `<p class="note">${esc(body.note)}</p>` : ''}</div>`;
    case 'log':
      return `<div class="log">${body.header ? `<div class="hdr">${esc(body.header)}</div>` : ''}${body.intro ? `<p>${esc(body.intro)}</p>` : ''}${table(
        body.columns,
        body.rows,
      )}${body.footnote ? `<p class="note">${esc(body.footnote)}</p>` : ''}</div>`;
    case 'handwriting':
      return `<div class="hand">${body.entries.map((handwrittenEntry) => `<p style="color:${esc(handwrittenEntry.ink)}">${esc(handwrittenEntry.text)}${handwrittenEntry.signedBy ? ` — ${esc(handwrittenEntry.signedBy)}` : ''}</p>`).join('')}</div>`;
    case 'receipt':
      return `<div class="receipt"><b>${esc(body.merchant)}</b>${body.lines.map((line) => `<div>${esc(line)}</div>`).join('')}<div class="at">${esc(body.at)}</div>${
        body.note ? `<p class="note">${esc(body.note)}</p>` : ''
      }</div>`;
    case 'map': {
      const label = (id: string) =>
        body.points.find((point) => point.id === id)?.label ?? id;
      return `<div class="doc"><p>${esc(body.description)}</p>${table(
        ['From', 'To', 'Time'],
        body.travel.map((route) => [
          label(route.from),
          label(route.to),
          `${route.minutes} min by ${route.mode}`,
        ]),
      )}</div>`;
    }
    case 'statement': {
      const suspect = pub.suspects.find(
        (suspect) => suspect.id === body.suspectId,
      );
      return `<div class="stmt"><p class="note">${esc(suspect?.name ?? '')} · ${esc(suspect?.role ?? '')} · interviewed ${esc(body.interviewedAt)}</p>${body.lines
        .map(
          (line) =>
            `<div class="line"><span class="n">${line.n}</span>${esc(line.text)}</div>`,
        )
        .join('')}</div>`;
    }
    case 'audio':
      return `<div class="log">${table(
        ['Time', 'Speaker', 'Words'],
        body.lines.map((audioLine) => [
          audioLine.t,
          audioLine.speaker,
          audioLine.text,
        ]),
      )}${body.note ? `<p class="note">${esc(body.note)}</p>` : ''}</div>`;
    case 'phone':
      return `<div class="phone">
        <h4>Messages</h4>${body.messages
          .map(
            (thread) =>
              `<div class="chat"><div class="thread">${esc(thread.thread)}</div>${thread.messages
                .map(
                  (message) =>
                    `<div class="msg ${message.me ? 'me' : ''}"><span class="who">${esc(message.from)}</span>${esc(message.text)}<span class="at">${esc(message.at)}</span></div>`,
                )
                .join('')}</div>`,
          )
          .join('')}
        ${
          body.calls.length
            ? `<h4>Calls</h4>${table(
                ['Time', 'Who', 'Type', 'Length'],
                body.calls.map((call) => [
                  call.at,
                  call.who,
                  call.dir,
                  call.duration,
                ]),
              )}`
            : ''
        }
        ${body.notes.length ? `<h4>Notes</h4>${body.notes.map((note) => `<p><b>${esc(note.title)}</b><br>${esc(note.text)}</p>`).join('')}` : ''}
        ${
          body.health.length
            ? `<h4>Health · watch heart rate</h4>${table(
                ['Time', 'Heart rate'],
                body.health.map((reading) => [
                  reading.t,
                  reading.bpm ? `${reading.bpm} bpm` : 'no pulse detected',
                ]),
              )}`
            : ''
        }
      </div>`;
  }
}

export function renderEvidenceCard(
  evidence: Evidence,
  pub: CasePublic,
  total: number,
): string {
  return `<section class="card">
    <div class="meta"><span>${esc(evidence.tab.toUpperCase())} · ${String(evidence.number).padStart(2, '0')}/${total}</span><span>${esc(evidence.id)}</span></div>
    <h3>${esc(evidence.title)}</h3>
    <p class="src">${esc(evidence.source)}</p>
    ${renderBody(evidence, pub)}
  </section>`;
}

export const PRINT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&family=IBM+Plex+Mono:wght@400;600&display=swap');
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: Manrope, Arial, sans-serif; color: #14110F; font-size: 10.5pt; line-height: 1.45; margin: 0; }
h1 { font-size: 30pt; margin: 0 0 4mm; letter-spacing: -0.5pt; }
h2 { font-size: 15pt; margin: 6mm 0 3mm; border-bottom: 2px solid #14110F; padding-bottom: 1.5mm; }
h3 { margin: 1mm 0 0; font-size: 13pt; }
h4 { margin: 3mm 0 1mm; font-size: 10pt; text-transform: uppercase; letter-spacing: 1pt; }
.mono, .meta, .log, .receipt, .hdr, .at, .stamp { font-family: 'IBM Plex Mono', monospace; }
.stampbox { display: inline-block; border: 2px solid #A8341F; color: #A8341F; padding: 1mm 3mm; font-family: 'IBM Plex Mono', monospace; letter-spacing: 2pt; transform: rotate(-2deg); }
.page { page-break-after: always; }
.card { border: 1px solid #C9BBA6; background: #FBF7F0; padding: 5mm; margin: 0 0 5mm; page-break-inside: avoid; }
.meta { display: flex; justify-content: space-between; font-size: 8pt; color: #5C4F42; }
.src { margin: 0 0 3mm; font-size: 8.5pt; color: #5C4F42; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 2mm 0; }
th, td { text-align: left; border-bottom: 1px solid #DCCFB9; padding: 1.2mm 2mm 1.2mm 0; vertical-align: top; }
th { border-bottom: 1.5px solid #14110F; }
.note { font-size: 8.5pt; color: #4A3F35; }
.hdr { font-size: 8pt; letter-spacing: 1pt; color: #4A3F35; }
.msg { margin: 1.5mm 0; padding: 2mm 3mm; background: #EFE6D6; border-radius: 3mm; max-width: 85%; }
.msg.me { margin-left: auto; background: #DCEBDD; }
.msg .who { display: block; font-size: 8pt; font-weight: 800; }
.msg .at { display: block; font-size: 7.5pt; color: #5C4F42; text-align: right; }
.thread { font-weight: 800; margin-top: 2mm; }
.line { display: flex; gap: 3mm; padding: 1.2mm 0; border-bottom: 1px dotted #C9BBA6; }
.line .n { font-family: 'IBM Plex Mono', monospace; color: #5C4F42; min-width: 6mm; }
.frame { border: 1px dashed #8A7C69; padding: 4mm; background: #F1E9DA; position: relative; }
.frame .tag { font-size: 7pt; letter-spacing: 1pt; color: #5C4F42; }
.frame .stamp { position: absolute; right: 3mm; bottom: 2mm; font-size: 8pt; color: #8A5A00; }
.caption { font-style: italic; font-size: 9pt; }
.markers { padding-left: 5mm; font-size: 9pt; }
.receipt { max-width: 90mm; border: 1px dashed #8A7C69; padding: 3mm; font-size: 9pt; background: #fff; }
.blank { display: inline-block; min-width: 60mm; border-bottom: 1px solid #14110F; height: 5mm; }
.box { border: 1px solid #14110F; padding: 4mm; margin: 3mm 0; }
.cut { border-top: 1.5px dashed #14110F; margin: 6mm 0 2mm; font-size: 8pt; color: #5C4F42; }
.spoiler { background: #14110F; color: #F3EBDD; padding: 3mm 4mm; font-weight: 800; letter-spacing: 1pt; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
`;
