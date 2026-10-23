'use client';

import { useState } from 'react';

export type ShareRequestBody =
  | {
      kind: 'daily';
      date?: string;
      ticket?: string;
      proof?: string;
      wrong: number;
      seconds: number;
    }
  | { kind: 'case'; caseId: string; token: string };

type Shared = { url: string; imageUrl: string };

/**
 * "Share result": makes a spoiler-free image card on the server, then opens the phone's
 * share sheet with the image and a link. Where that isn't possible (most desktops) the
 * link is copied and the image can be downloaded.
 */
export function ShareButton({
  request,
  text,
  className,
}: {
  /** Built when clicked, so it always carries the latest result. */
  request: () => ShareRequestBody | null;
  text: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState<Shared | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const create = async (): Promise<Shared | null> => {
    if (shared) return shared;
    const body = request();
    if (!body) return null;
    const response = await fetch('/api/share', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const reply = (await response.json()) as {
      ok: boolean;
      token?: string;
      message?: string;
    };
    if (!reply.ok || !reply.token) {
      setNote(reply.message ?? 'Couldn’t make your card. Please try again.');
      return null;
    }
    const path = `/s/${reply.token}`;
    const result = {
      url: `${window.location.origin}${path}`,
      imageUrl: `${path}/card.png`,
    };
    setShared(result);
    return result;
  };

  const share = async () => {
    setBusy(true);
    setNote(null);
    try {
      const result = await create();
      if (!result) return;
      const image = await fetch(result.imageUrl)
        .then((response) => (response.ok ? response.blob() : null))
        .catch(() => null);
      const file = image
        ? new File([image], 'unsealed-result.png', { type: 'image/png' })
        : null;
      const message = `${text}\n${result.url}`;
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: message });
      } else if (navigator.share) {
        await navigator.share({ text, url: result.url });
      } else {
        await navigator.clipboard.writeText(message);
        setNote('Link copied. Paste it anywhere: it shows your result card.');
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError')
        setNote('Couldn’t open sharing. Use the link below instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void share()}
        disabled={busy}
        className={
          className ??
          'h-12 w-full rounded-xl border border-line-strong font-extrabold disabled:opacity-50'
        }
      >
        {busy ? 'Making your card…' : 'Share result card'}
      </button>
      {shared && (
        <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          <a
            href={shared.imageUrl}
            download="unsealed-result.png"
            className="font-bold text-amber"
          >
            Download image
          </a>
          <a
            href={shared.url}
            target="_blank"
            rel="noopener"
            className="font-bold text-amber"
          >
            Open share page
          </a>
        </p>
      )}
      {note && (
        <p role="status" className="text-center text-sm text-muted">
          {note}
        </p>
      )}
    </div>
  );
}
