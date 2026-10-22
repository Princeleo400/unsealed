import 'server-only';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const WaitlistInput = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  country: z.string().trim().max(60).optional().or(z.literal('')),
  source: z.string().trim().max(40).optional(),
  // Honeypot: real people never fill this hidden field.
  company: z.string().max(200).optional(),
});
export type WaitlistInput = z.infer<typeof WaitlistInput>;

export type WaitlistResult = { status: 'added' | 'exists' };

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function joinWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  const row = { email: input.email, country: input.country || null, source: input.source ?? 'landing' };
  const db = supabase();
  if (db) {
    const { error } = await db.from('waitlist').insert(row);
    if (!error) return { status: 'added' };
    if (error.code === '23505') return { status: 'exists' }; // unique violation
    throw new Error(`waitlist insert failed: ${error.message}`);
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Supabase env vars are missing in production');
  // Dev fallback: a local JSONL file so the form works before Supabase is set up.
  const dir = join(process.cwd(), '.data');
  const file = join(dir, 'waitlist.jsonl');
  await mkdir(dir, { recursive: true });
  const existing = await readFile(file, 'utf8').catch(() => '');
  if (existing.split('\n').some((l) => l && JSON.parse(l).email === row.email)) return { status: 'exists' };
  await appendFile(file, JSON.stringify({ ...row, created_at: new Date().toISOString() }) + '\n');
  return { status: 'added' };
}
