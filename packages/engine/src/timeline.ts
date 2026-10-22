import type { CasePublic } from './schema';
import type { SessionState } from './state';

export type TimelineEvent = {
  at: string;
  label: string;
  evidenceId: string;
  suspectIds: string[];
  place?: string;
};

/** Every timestamp from evidence the player has READ, in time order. */
export function buildTimeline(pub: CasePublic, state: SessionState): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const e of pub.evidence) {
    if (!state.read.includes(e.id)) continue;
    for (const t of e.timestamps) {
      events.push({ at: t.at, label: t.label, evidenceId: e.id, suspectIds: t.suspectIds ?? [], place: t.place });
    }
  }
  return events.sort((x, y) => (x.at === y.at ? x.evidenceId.localeCompare(y.evidenceId) : x.at.localeCompare(y.at)));
}

export type Placement = { suspectId: string; at: string; place: string; evidenceId?: string };

const toMinutes = (stamp: string): number => {
  const d = new Date(`${stamp}:00Z`);
  return Math.round(d.getTime() / 60000);
};

/**
 * A conflict = the same suspect placed (by the player, or by read evidence with a place)
 * in two different places less than `windowMinutes` apart. The UI shows these in amber
 * without explaining them (FR-TIME-03).
 */
export function findConflicts(
  pub: CasePublic,
  state: SessionState,
  placements: Placement[],
  windowMinutes = 10,
): { suspectId: string; a: Placement; b: Placement }[] {
  const fromEvidence: Placement[] = buildTimeline(pub, state).flatMap((ev) =>
    ev.place ? ev.suspectIds.map((s) => ({ suspectId: s, at: ev.at, place: ev.place as string, evidenceId: ev.evidenceId })) : [],
  );
  const all = [...placements, ...fromEvidence];
  const conflicts: { suspectId: string; a: Placement; b: Placement }[] = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!;
      const b = all[j]!;
      if (a.suspectId !== b.suspectId || a.place === b.place) continue;
      if (Math.abs(toMinutes(a.at) - toMinutes(b.at)) < windowMinutes) conflicts.push({ suspectId: a.suspectId, a, b });
    }
  }
  return conflicts;
}
