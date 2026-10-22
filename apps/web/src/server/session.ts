import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SessionState } from '@unsealed/engine';

/**
 * Stateless play sessions for the web MVP: the server hands the player a signed copy of
 * their session state, and only accepts it back if the signature matches. Players can't
 * forge breakthroughs or unlock evidence by editing it. (Phase 1 later moves this into
 * Supabase `play_sessions` for cross-device resume — docs/04 §4.)
 */
const DEV_SECRET = 'dev-only-secret-change-me-dev-only-secret-change-me';

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET (32+ chars) is required in production');
  return DEV_SECRET;
}

const b64url = (buf: Buffer) => buf.toString('base64url');

export function signState(state: SessionState): string {
  const body = b64url(Buffer.from(JSON.stringify(state), 'utf8'));
  const mac = b64url(createHmac('sha256', secret()).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyState(token: string, expect: { caseId: string; version: number }): SessionState | null {
  const [body, mac] = token.split('.');
  if (!body || !mac) return null;
  const good = createHmac('sha256', secret()).update(body).digest();
  const given = Buffer.from(mac, 'base64url');
  if (given.length !== good.length || !timingSafeEqual(given, good)) return null;
  try {
    const state = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionState;
    if (state.caseId !== expect.caseId || state.version !== expect.version) return null;
    return state;
  } catch {
    return null;
  }
}
