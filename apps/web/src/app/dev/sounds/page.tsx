import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SoundBoard } from './SoundBoard';

export const metadata: Metadata = {
  title: 'Sound check',
  robots: { index: false },
};

/** Development only: hear every game sound and vibration in one place. */
export default function SoundCheckPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-red-text">
          DEVELOPMENT ONLY
        </p>
        <h1 className="mt-1 text-3xl font-extrabold">Sound check</h1>
        <p className="mt-2 text-body">
          Every sound effect in the game. Tap to hear it (and feel it, on an
          Android phone). This page doesn&apos;t exist on the live site.
        </p>
      </div>
      <SoundBoard />
    </main>
  );
}
