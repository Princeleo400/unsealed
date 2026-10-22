import { z } from 'zod';

/** The player's own scratch work on a case. Never affects grading, so it's safe to sync as-is. */
export const LocalBoardSchema = z.object({
  pins: z.array(z.string().max(20)).max(80).default([]),
  notes: z.string().max(5000).default(''),
  crossed: z.array(z.string().max(30)).max(20).default([]),
  placements: z
    .array(z.object({ suspectId: z.string().max(30), at: z.string().max(20), place: z.string().max(80) }))
    .max(100)
    .default([]),
  seenBriefing: z.boolean().default(false),
});
export type LocalBoard = z.infer<typeof LocalBoardSchema>;
export const EMPTY_BOARD: LocalBoard = { pins: [], notes: '', crossed: [], placements: [], seenBriefing: false };

export function parseBoard(x: unknown): LocalBoard | null {
  const r = LocalBoardSchema.safeParse(x);
  return r.success ? r.data : null;
}
