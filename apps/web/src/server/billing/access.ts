import 'server-only';
import { catalogEntry } from '@/lib/catalog';
import type { AccessSummary } from '@/lib/view-types';
import type { BillingStore, EntitlementRow } from './store';

/** What a player can open right now, derived from their active entitlements. */
export type Access = {
  pass: { productId: string; source: string; expiresAt: Date | null } | null;
  cases: string[];
};

export const NO_ACCESS: Access = { pass: null, cases: [] };

export function accessFrom(rows: EntitlementRow[]): Access {
  const passes = rows.filter((entitlement) => entitlement.kind === 'pass');
  // Several passes (e.g. monthly then annual): the one that lasts longest wins.
  const pass = passes.sort(
    (first, second) =>
      (second.expiresAt?.getTime() ?? Infinity) -
      (first.expiresAt?.getTime() ?? Infinity),
  )[0];
  return {
    pass: pass
      ? {
          productId: pass.productId,
          source: pass.source,
          expiresAt: pass.expiresAt,
        }
      : null,
    cases: [
      ...new Set(
        rows
          .filter(
            (entitlement) => entitlement.kind === 'case' && entitlement.caseId,
          )
          .map((entitlement) => entitlement.caseId!),
      ),
    ],
  };
}

export async function loadAccess(
  store: BillingStore,
  userId: string,
): Promise<Access> {
  return accessFrom(await store.active(userId));
}

/** Free cases are open to everyone (signed in or not); paid cases need the case or a Case Pass. */
export function canOpen(slug: string, access: Access | null): boolean {
  const entry = catalogEntry(slug);
  if (!entry) return false;
  if (!entry.productId) return true;
  return Boolean(access && (access.pass || access.cases.includes(slug)));
}

/** Client-safe summary for pages. */
export function summarise(access: Access): AccessSummary {
  return {
    pass: access.pass
      ? {
          productId: access.pass.productId,
          source: access.pass.source,
          expiresAt: access.pass.expiresAt?.toISOString() ?? null,
        }
      : null,
    cases: access.cases,
  };
}
