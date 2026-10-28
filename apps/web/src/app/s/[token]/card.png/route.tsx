import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { siteUrl } from '@/lib/site';
import { BADGE_LABELS, clock, readShare, type ShareCard } from '@/server/share';

export const runtime = 'nodejs';

const COLORS = {
  ink: '#14110f',
  walnut: '#2a211b',
  line: '#3a2f27',
  lineStrong: '#5c4f42',
  paper: '#f3ebdd',
  muted: '#c9bba6',
  faint: '#a89a86',
  amber: '#e8b83a',
  red: '#c2412d',
  redText: '#e26a52',
  greenText: '#6cc293',
};

let fontsPromise: Promise<
  { name: string; data: Buffer; weight: 400 | 500 | 600 | 800 }[]
> | null = null;
function loadFonts() {
  // The app folder locally; on some hosts the working folder is the repo root instead.
  const folder =
    [
      join(process.cwd(), 'assets/fonts'),
      join(process.cwd(), 'apps/web/assets/fonts'),
    ].find((candidate) => existsSync(candidate)) ??
    join(process.cwd(), 'assets/fonts');
  fontsPromise ??= Promise.all([
    readFile(join(folder, 'manrope-latin-500-normal.woff')).then((data) => ({
      name: 'Manrope',
      data,
      weight: 500 as const,
    })),
    readFile(join(folder, 'manrope-latin-800-normal.woff')).then((data) => ({
      name: 'Manrope',
      data,
      weight: 800 as const,
    })),
    readFile(join(folder, 'ibm-plex-mono-latin-400-normal.woff')).then(
      (data) => ({ name: 'Plex Mono', data, weight: 400 as const }),
    ),
    readFile(join(folder, 'ibm-plex-mono-latin-600-normal.woff')).then(
      (data) => ({ name: 'Plex Mono', data, weight: 600 as const }),
    ),
  ]);
  return fontsPromise;
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span
        style={{
          fontFamily: 'Plex Mono',
          fontWeight: 600,
          fontSize: 54,
          color: COLORS.amber,
          lineHeight: 1,
        }}
      >
        {value}
      </span>
      <span
        style={{
          marginTop: 6,
          fontFamily: 'Plex Mono',
          fontSize: 20,
          letterSpacing: 3,
          color: COLORS.faint,
        }}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
}

function Card({ card, host }: { card: ShareCard; host: string }) {
  const stamp = card.solved
    ? card.kind === 'case'
      ? 'CASE CLOSED'
      : 'SOLVED'
    : 'CASE COLD';
  const stampColor = card.solved ? COLORS.greenText : COLORS.redText;
  const kicker =
    card.kind === 'case'
      ? `CASE FILE · ${card.city}`
      : `${card.label} · ${card.city} · ${card.difficulty}`;
  const headline =
    card.kind === 'case'
      ? card.title
      : card.solved
        ? card.seconds === null
          ? 'Solved it'
          : `Solved in ${clock(card.seconds)}`
        : 'The case went cold';

  // Satori ignores `gap` on some rows, so spacing uses margins.
  const stats =
    card.kind === 'case'
      ? [
          { value: String(card.score), label: 'score' },
          {
            value: `${card.breakthroughs}/${card.breakthroughsTotal}`,
            label: 'breakthroughs',
          },
          card.solved
            ? { value: `${card.accusations}/3`, label: 'accusations' }
            : { value: '3/3', label: 'accusations used' },
        ]
      : [
          card.solved
            ? {
                value: String(card.wrong),
                label: card.wrong === 1 ? 'wrong guess' : 'wrong guesses',
              }
            : { value: '3', label: 'tries used' },
        ];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: COLORS.ink,
        padding: 28,
        fontFamily: 'Manrope',
        color: COLORS.paper,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          border: `2px solid ${COLORS.line}`,
          borderRadius: 28,
          backgroundColor: COLORS.walnut,
          padding: '36px 56px 32px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontFamily: 'Plex Mono',
                fontWeight: 600,
                fontSize: 26,
                letterSpacing: 10,
                color: COLORS.redText,
              }}
            >
              UNSEALED
            </span>
            <div
              style={{
                display: 'flex',
                transform: 'rotate(-6deg)',
                border: `5px solid ${stampColor}`,
                borderRadius: 8,
                padding: '6px 20px',
                fontFamily: 'Plex Mono',
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: 8,
                color: stampColor,
              }}
            >
              {stamp}
            </div>
          </div>
          <span
            style={{
              marginTop: 14,
              fontFamily: 'Plex Mono',
              fontSize: 24,
              letterSpacing: 3,
              color: COLORS.muted,
            }}
          >
            {kicker.toUpperCase()}
          </span>
          <span
            style={{
              marginTop: 10,
              fontWeight: 800,
              fontSize: 80,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            {headline}
          </span>
          {card.kind === 'case' && card.badges.length > 0 && (
            <div style={{ display: 'flex', marginTop: 18 }}>
              {card.badges.map((badge) => (
                <div
                  key={badge}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginRight: 12,
                    border: `2px solid ${COLORS.amber}`,
                    borderRadius: 999,
                    padding: '6px 18px',
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: COLORS.amber,
                  }}
                >
                  {BADGE_LABELS[badge] ?? badge}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          {card.kind === 'daily' && (
            <div style={{ display: 'flex', marginRight: 36, marginBottom: 6 }}>
              {Array.from({ length: 3 }, (_, slot) => (
                <div
                  key={slot}
                  style={{
                    width: 46,
                    height: 46,
                    marginRight: 10,
                    borderRadius: 10,
                    backgroundColor:
                      slot < card.wrong
                        ? COLORS.red
                        : slot === card.wrong && card.solved
                          ? COLORS.greenText
                          : COLORS.line,
                  }}
                />
              ))}
            </div>
          )}
          {stats.map((stat) => (
            <div key={stat.label} style={{ display: 'flex', marginRight: 64 }}>
              <Stat value={stat.value} label={stat.label} />
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `2px solid ${COLORS.line}`,
            paddingTop: 20,
          }}
        >
          <span style={{ fontWeight: 800, fontSize: 38, color: COLORS.amber }}>
            Can you solve it?
          </span>
          <span
            style={{
              fontFamily: 'Plex Mono',
              fontSize: 24,
              color: COLORS.faint,
            }}
          >
            {host}
          </span>
        </div>
      </div>
    </div>
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const card = readShare(token);
  if (!card) return new Response('Not found', { status: 404 });
  const host = new URL(
    process.env.SITE_URL || process.env.VERCEL ? siteUrl() : request.url,
  ).host;
  return new ImageResponse(<Card card={card} host={host} />, {
    width: 1200,
    height: 630,
    fonts: await loadFonts(),
    headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
