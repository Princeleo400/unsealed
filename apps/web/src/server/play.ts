import 'server-only';
import {
  ActionError,
  checkString,
  confront,
  followLead,
  getHint,
  newSession,
  readEvidence,
  searchArchive,
  submitVerdict,
  type Evidence,
  type SessionState,
} from '@unsealed/engine';
import { z } from 'zod';
import { catalogEntry } from '@/lib/catalog';
import type { PlayResponse, PlayResult } from '@/lib/view-types';
import { canOpen, type Access } from './billing/access';
import { getCase } from './cases';
import { progressScore, type SaveStore } from './saves';
import { signState, verifyState } from './session';
import { AD_HINTS_PER_CASE, FREE_HINTS_PER_CASE, buildView, hintsUsed } from './view';

const Action = z.discriminatedUnion('type', [
  // fresh: true = "Play again": ignore any saved progress and overwrite it.
  z.object({ type: z.literal('start'), fresh: z.boolean().optional() }),
  z.object({ type: z.literal('view') }),
  z.object({ type: z.literal('read'), evidenceId: z.string().max(20) }),
  z.object({ type: z.literal('lead'), leadId: z.string().max(20) }),
  z.object({ type: z.literal('string'), a: z.string().max(20), b: z.string().max(20), relation: z.enum(['contradiction', 'corroboration', 'link']) }),
  z.object({ type: z.literal('confront'), statementId: z.string().max(20), line: z.number().int().min(1).max(99), evidenceId: z.string().max(20) }),
  z.object({ type: z.literal('search'), query: z.string().max(60) }),
  z.object({
    type: z.literal('hint'),
    tier: z.enum(['nudge', 'pointer', 'reveal']),
    adReward: z.object({ provider: z.enum(['gam', 'no-fill', 'dev']), id: z.string().max(100) }).optional(),
  }),
  z.object({
    type: z.literal('verdict'),
    answer: z.object({
      who: z.record(z.string().max(30), z.string().max(30)),
      how: z.record(z.string().max(30), z.string().max(30)),
      why: z.record(z.string().max(30), z.string().max(30)),
      proof: z.array(z.string().max(20)).max(6),
    }),
  }),
]);

export const PlayRequest = z.object({ token: z.string().max(60_000).optional(), action: Action });

const brief = (e: Evidence) => ({ id: e.id, number: e.number, title: e.title });

export type PlayContext = {
  userId?: string | null;
  store?: SaveStore | null;
  /** The player's purchases. null = signed out or billing off; 'error' = couldn't be checked right now. */
  access?: Access | 'error' | null;
};
export type SyncInfo = NonNullable<Extract<PlayResponse, { ok: true }>['sync']>;

export async function handlePlay(slug: string, body: unknown, ctx: PlayContext = {}): Promise<{ status: number; json: PlayResponse }> {
  const found = getCase(slug);
  if (!found) return { status: 404, json: { ok: false, error: { code: 'no_case', message: 'Case not found.' } } };
  const { pub, sol } = found;

  // Paywall (FR-PAY-04): a paid case needs the case itself or an active Case Pass, checked on every request
  // so a pass that has ended stops working. Free cases never touch billing.
  const entry = catalogEntry(slug);
  const access = ctx.access === 'error' ? null : (ctx.access ?? null);
  if (entry?.productId) {
    if (ctx.access === 'error')
      return { status: 503, json: { ok: false, error: { code: 'access_unavailable', message: 'We couldn’t check your purchases just now. Please try again.' } } };
    if (!canOpen(slug, access)) {
      const signedIn = Boolean(ctx.userId);
      return {
        status: 402,
        json: {
          ok: false,
          error: { code: 'paywall', message: signedIn ? 'Unlock this case to open the file.' : 'Sign in and unlock this case to open the file.' },
          paywall: { slug, title: entry.title, productId: entry.productId, signedIn },
        },
      };
    }
  }
  const unlimitedHints = Boolean(access?.pass);
  const view = (st: SessionState) => buildView(pub, sol, st, { unlimitedHints });

  const parsed = PlayRequest.safeParse(body);
  if (!parsed.success) return { status: 400, json: { ok: false, error: { code: 'bad_request', message: 'Invalid request.' } } };
  const { token, action } = parsed.data;

  const expect = { caseId: pub.id, version: pub.version };
  const signedIn = Boolean(ctx.userId && ctx.store);
  let sync: SyncInfo = { signedIn, source: 'device', saved: false };

  let state: SessionState;
  if (action.type === 'start') {
    const local = !action.fresh && token ? verifyState(token, expect) : null;
    let remote: SessionState | null = null;
    let remoteBoard: unknown;
    if (signedIn && !action.fresh) {
      try {
        const row = await ctx.store!.get(ctx.userId!, pub.id);
        remote = row ? verifyState(row.token, expect) : null; // a tampered or outdated save is ignored
        remoteBoard = row?.board;
      } catch (e) {
        console.error('play_saves read failed', e);
      }
    }
    if (remote && progressScore(remote) >= progressScore(local)) {
      state = remote;
      sync = { signedIn, source: 'account', saved: true, board: remoteBoard };
    } else {
      state = local ?? newSession(pub);
      sync = { signedIn, source: local ? 'device' : 'new', saved: false };
    }
  } else {
    const verified = token ? verifyState(token, { caseId: pub.id, version: pub.version }) : null;
    if (!verified) return { status: 409, json: { ok: false, error: { code: 'session_invalid', message: 'Your session could not be verified. Start the case again.' } } };
    state = verified;
  }

  let result: PlayResult = { type: 'none' };
  let unlocked: Evidence[] = [];
  try {
    switch (action.type) {
      case 'start':
      case 'view':
        break;
      case 'read':
        state = readEvidence(pub, state, action.evidenceId);
        break;
      case 'lead': {
        const r = followLead(pub, state, action.leadId);
        const lead = pub.leads.find((l) => l.id === action.leadId)!;
        state = r.state;
        unlocked = r.unlockedEvidence;
        result = { type: 'lead', title: lead.title, costHours: lead.costHours };
        break;
      }
      case 'string': {
        const r = checkString(pub, sol, state, action.a, action.b, action.relation);
        state = r.state;
        unlocked = r.unlockedEvidence;
        result = { type: 'string', valid: r.valid, duplicate: r.duplicate, breakthrough: 'breakthrough' in r ? r.breakthrough : undefined };
        break;
      }
      case 'confront': {
        const r = confront(pub, sol, state, action.statementId, action.line, action.evidenceId);
        state = r.state;
        unlocked = r.unlockedEvidence;
        result = { type: 'confront', valid: r.valid, duplicate: r.duplicate, revealLines: r.revealLines };
        break;
      }
      case 'search': {
        const r = searchArchive(pub, sol, state, action.query);
        state = r.state;
        unlocked = r.unlockedEvidence;
        result = { type: 'search', query: action.query, results: r.results.map(brief) };
        break;
      }
      case 'hint': {
        const used = hintsUsed(state);
        if (unlimitedHints) {
          // Case Pass: unlimited hints, no ads (they still cost score).
        } else if (used >= FREE_HINTS_PER_CASE + AD_HINTS_PER_CASE)
          throw new ActionError('hint_limit', 'You’ve used every hint for this case. Case Pass gives unlimited hints with no ads.');
        else if (used >= FREE_HINTS_PER_CASE && !action.adReward)
          throw new ActionError('ad_required', 'Watch a short video to unlock this hint.');
        else if (action.adReward?.provider === 'dev' && process.env.NODE_ENV === 'production')
          throw new ActionError('ad_required', 'Watch a short video to unlock this hint.');
        const r = getHint(pub, sol, state, action.tier);
        state = r.state;
        result = { type: 'hint', tier: action.tier, text: r.text, cost: r.scoreCost };
        break;
      }
      case 'verdict': {
        const r = submitVerdict(pub, sol, state, action.answer);
        state = r.state;
        result = { type: 'verdict', correctSections: r.correctSections, accusationsLeft: r.accusationsLeft, status: r.status };
        break;
      }
    }
  } catch (e) {
    if (e instanceof ActionError) {
      return {
        status: 422,
        json: { ok: false, error: { code: e.code, message: e.message }, token: signState(state), view: view(state) },
      };
    }
    throw e;
  }

  const newToken = signState(state);
  if (signedIn) {
    try {
      await ctx.store!.putToken(ctx.userId!, pub.id, newToken);
      sync = { ...sync, saved: true };
    } catch (e) {
      console.error('play_saves write failed', e); // the game carries on; this action just isn't synced
      sync = { ...sync, saved: false };
    }
  }

  return {
    status: 200,
    json: { ok: true, token: newToken, view: view(state), result, unlocked: unlocked.map(brief), sync },
  };
}
