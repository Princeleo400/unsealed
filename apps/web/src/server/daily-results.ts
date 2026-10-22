import 'server-only';
import { DAILY_EPOCH } from '@unsealed/engine';
import { z } from 'zod';
import { todayUTC } from './daily';
import { serverSupabase } from './supabase';

export type DailyHistory = Record<string, { solved: boolean; wrong: number; seconds: number }>;

export const ResultInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  solved: z.boolean(),
  wrong: z.number().int().min(0).max(3),
  seconds: z.number().int().min(0).max(86400),
});
export const ResultsInput = z.object({ results: z.array(ResultInput).min(1).max(60) });

/** Only dates that have actually happened since launch can be recorded. */
export function validResultDate(date: string, now = new Date()): boolean {
  const t = Date.parse(`${date}T00:00:00Z`);
  return !Number.isNaN(t) && t >= Date.parse(`${DAILY_EPOCH}T00:00:00Z`) && t <= Date.parse(`${todayUTC(now)}T00:00:00Z`);
}

export interface ResultsStore {
  list(userId: string): Promise<DailyHistory>;
  /** Inserts results; existing days are left untouched (the first result recorded for a day counts). */
  add(userId: string, rows: z.infer<typeof ResultInput>[]): Promise<void>;
}

export async function supabaseResultsStore(): Promise<ResultsStore | null> {
  const sb = await serverSupabase();
  if (!sb) return null;
  return {
    async list(userId) {
      const { data, error } = await sb
        .from('daily_results')
        .select('date, solved, wrong, seconds')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(400);
      if (error) throw error;
      const out: DailyHistory = {};
      for (const r of data ?? []) out[r.date as string] = { solved: r.solved as boolean, wrong: r.wrong as number, seconds: r.seconds as number };
      return out;
    },
    async add(userId, rows) {
      const { error } = await sb
        .from('daily_results')
        .upsert(rows.map((r) => ({ user_id: userId, ...r })), { onConflict: 'user_id,date', ignoreDuplicates: true });
      if (error) throw error;
    },
  };
}
