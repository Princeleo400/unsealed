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
export function buildTimeline(
  pub: CasePublic,
  state: SessionState,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const evidence of pub.evidence) {
    if (!state.read.includes(evidence.id)) continue;
    for (const timestamp of evidence.timestamps) {
      events.push({
        at: timestamp.at,
        label: timestamp.label,
        evidenceId: evidence.id,
        suspectIds: timestamp.suspectIds ?? [],
        place: timestamp.place,
      });
    }
  }
  return events.sort((first, second) =>
    first.at === second.at
      ? first.evidenceId.localeCompare(second.evidenceId)
      : first.at.localeCompare(second.at),
  );
}

export type Placement = {
  suspectId: string;
  at: string;
  place: string;
  evidenceId?: string;
};

const toMinutes = (stamp: string): number => {
  const date = new Date(`${stamp}:00Z`);
  return Math.round(date.getTime() / 60000);
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
    ev.place
      ? ev.suspectIds.map((suspectId) => ({
          suspectId: suspectId,
          at: ev.at,
          place: ev.place as string,
          evidenceId: ev.evidenceId,
        }))
      : [],
  );
  const all = [...placements, ...fromEvidence];
  const conflicts: { suspectId: string; a: Placement; b: Placement }[] = [];
  for (let index = 0; index < all.length; index++) {
    for (let innerIndex = index + 1; innerIndex < all.length; innerIndex++) {
      const placement = all[index]!;
      const otherPlacement = all[innerIndex]!;
      if (
        placement.suspectId !== otherPlacement.suspectId ||
        placement.place === otherPlacement.place
      )
        continue;
      if (
        Math.abs(toMinutes(placement.at) - toMinutes(otherPlacement.at)) <
        windowMinutes
      )
        conflicts.push({
          suspectId: placement.suspectId,
          a: placement,
          b: otherPlacement,
        });
    }
  }
  return conflicts;
}
