import 'server-only';
import type { SessionState } from '@unsealed/engine';
import { serverSupabase } from './supabase';

/** Where signed-in players' case saves live. Swappable so the sync rules can be unit-tested. */
export interface SaveStore {
  get(userId: string, caseId: string): Promise<{ token: string; board: unknown } | null>;
  putToken(userId: string, caseId: string, token: string): Promise<void>;
  putBoard(userId: string, caseId: string, board: unknown): Promise<void>;
}

/** Supabase-backed store, acting as the signed-in player (row-level security applies). */
export async function supabaseSaveStore(): Promise<SaveStore | null> {
  const sb = await serverSupabase();
  if (!sb) return null;
  return {
    async get(userId, caseId) {
      const { data, error } = await sb.from('play_saves').select('token, board').eq('user_id', userId).eq('case_id', caseId).maybeSingle();
      if (error) throw error;
      return data ? { token: data.token as string, board: data.board } : null;
    },
    async putToken(userId, caseId, token) {
      const { error } = await sb
        .from('play_saves')
        .upsert({ user_id: userId, case_id: caseId, token, updated_at: new Date().toISOString() }, { onConflict: 'user_id,case_id' });
      if (error) throw error;
    },
    async putBoard(userId, caseId, board) {
      const { error } = await sb.from('play_saves').update({ board, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('case_id', caseId);
      if (error) throw error;
    },
  };
}

/** In-memory store for tests. */
export class MemorySaveStore implements SaveStore {
  rows = new Map<string, { token: string; board: unknown }>();
  failing = false;
  private key = (u: string, c: string) => `${u}|${c}`;
  async get(u: string, c: string) {
    if (this.failing) throw new Error('db down');
    return this.rows.get(this.key(u, c)) ?? null;
  }
  async putToken(u: string, c: string, token: string) {
    if (this.failing) throw new Error('db down');
    const prev = this.rows.get(this.key(u, c));
    this.rows.set(this.key(u, c), { token, board: prev?.board ?? {} });
  }
  async putBoard(u: string, c: string, board: unknown) {
    if (this.failing) throw new Error('db down');
    const prev = this.rows.get(this.key(u, c));
    if (prev) this.rows.set(this.key(u, c), { ...prev, board });
  }
}

/**
 * How far along a save is. Used when the browser and the account disagree: the further one wins.
 * Finished cases beat unfinished; then accusations, breakthroughs, unlocks and evidence read.
 */
export function progressScore(s: SessionState | null): number {
  if (!s) return -1;
  return (
    (s.status !== 'active' ? 1_000_000 : 0) +
    s.accusations.length * 10_000 +
    s.breakthroughs.length * 500 +
    s.unlocked.length * 50 +
    s.read.length * 5 +
    s.strings.length +
    s.searches.length
  );
}
