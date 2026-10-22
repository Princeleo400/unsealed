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
import type { PlayResponse, PlayResult } from '@/lib/view-types';
import { getCase } from './cases';
import { signState, verifyState } from './session';
import { AD_HINTS_PER_CASE, FREE_HINTS_PER_CASE, buildView, hintsUsed } from './view';

const Action = z.discriminatedUnion('type', [
  z.object({ type: z.literal('start') }),
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

export function handlePlay(slug: string, body: unknown): { status: number; json: PlayResponse } {
  const found = getCase(slug);
  if (!found) return { status: 404, json: { ok: false, error: { code: 'no_case', message: 'Case not found.' } } };
  const { pub, sol } = found;

  const parsed = PlayRequest.safeParse(body);
  if (!parsed.success) return { status: 400, json: { ok: false, error: { code: 'bad_request', message: 'Invalid request.' } } };
  const { token, action } = parsed.data;

  let state: SessionState;
  if (action.type === 'start') {
    state = (token && verifyState(token, { caseId: pub.id, version: pub.version })) || newSession(pub);
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
        if (used >= FREE_HINTS_PER_CASE + AD_HINTS_PER_CASE)
          throw new ActionError('hint_limit', 'You’ve used every hint for this case. Case Pass gives unlimited hints with no ads.');
        if (used >= FREE_HINTS_PER_CASE && !action.adReward)
          throw new ActionError('ad_required', 'Watch a short video to unlock this hint.');
        if (action.adReward?.provider === 'dev' && process.env.NODE_ENV === 'production')
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
        json: { ok: false, error: { code: e.code, message: e.message }, token: signState(state), view: buildView(pub, sol, state) },
      };
    }
    throw e;
  }

  return {
    status: 200,
    json: { ok: true, token: signState(state), view: buildView(pub, sol, state), result, unlocked: unlocked.map(brief) },
  };
}
