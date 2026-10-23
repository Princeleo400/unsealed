import 'server-only';
import { currentUser } from '../supabase';
import { loadAccess, type Access } from './access';
import { supabaseBillingStore } from './store';

/**
 * The signed-in player's purchases, for features that only add perks (the full
 * Daily archive). Any failure counts as "no purchases": a perk is withheld,
 * nothing breaks. Paid cases use the stricter check in the play route instead.
 */
export async function viewerAccess(): Promise<Access | null> {
  const user = await currentUser();
  if (!user) return null;
  const store = supabaseBillingStore();
  if (!store) return null;
  try {
    return await loadAccess(store, user.id);
  } catch (error) {
    console.error('access check failed', error);
    return null;
  }
}
