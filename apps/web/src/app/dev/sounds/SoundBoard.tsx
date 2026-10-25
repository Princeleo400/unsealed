'use client';

import { feedback, type SoundCue } from '@/lib/feedback';

const CUES: { cue: SoundCue; when: string }[] = [
  { cue: 'tap', when: 'Choosing a suspect, place, difficulty or pin' },
  { cue: 'mark', when: 'Ruling something out on a grid (✕)' },
  { cue: 'confirm', when: 'Confirming on a grid (✓)' },
  { cue: 'paper', when: 'Opening evidence, resuming a Brief' },
  { cue: 'unlock', when: 'New evidence, a lead, starting a Bonus Brief' },
  { cue: 'link', when: 'A red string that holds' },
  { cue: 'breakthrough', when: 'A breakthrough, or a statement breaks' },
  { cue: 'wrong', when: 'Wrong answer, a string that doesn’t hold' },
  { cue: 'hint', when: 'A hint is shown' },
  { cue: 'coin', when: 'Coins earned' },
  { cue: 'stamp', when: 'Case closed / Brief solved' },
  { cue: 'cold', when: 'The case went cold' },
];

export function SoundBoard() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {CUES.map(({ cue, when }) => (
        <li key={cue}>
          <button
            type="button"
            onClick={() => feedback(cue)}
            className="flex w-full flex-col items-start gap-1 rounded-xl border border-line bg-walnut p-4 text-left hover:border-amber"
          >
            <span className="font-mono text-sm font-semibold text-amber">
              {cue}
            </span>
            <span className="text-sm text-muted">{when}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
