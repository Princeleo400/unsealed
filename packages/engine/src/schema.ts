import { z } from 'zod';

/** ISO-like local timestamp of the case night, e.g. "2026-03-06T00:22". Sorts lexically. */
const Stamp = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    'timestamp must be YYYY-MM-DDTHH:MM',
  );
const Id = z.string().min(1);

export const GateSchema = z.object({
  kind: z.enum(['lead', 'breakthrough', 'search', 'confront']),
  id: Id,
});
export type Gate = z.infer<typeof GateSchema>;

export const TimestampSchema = z.object({
  at: Stamp,
  label: z.string().min(1),
  suspectIds: z.array(Id).optional(),
  place: z.string().optional(),
});
export type CaseTimestamp = z.infer<typeof TimestampSchema>;

const ChatMessage = z.object({
  from: z.string(),
  at: z.string(),
  text: z.string(),
  me: z.boolean().optional(),
});

export const EvidenceBodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('document'), markdown: z.string().min(1) }),
  z.object({
    type: z.literal('photo'),
    caption: z.string().min(1),
    scene: z.string().min(1), // written description used for the illustration brief + screen readers
    markers: z
      .array(z.object({ n: z.number().int(), label: z.string() }))
      .optional(),
    stamp: z.string().optional(),
    asset: z.string().optional(),
  }),
  z.object({
    type: z.literal('chat'),
    thread: z.string(),
    messages: z.array(ChatMessage).min(1),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('log'),
    header: z.string().optional(),
    intro: z.string().optional(),
    columns: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())).min(1),
    footnote: z.string().optional(),
  }),
  z.object({
    type: z.literal('handwriting'),
    entries: z
      .array(
        z.object({
          text: z.string(),
          signedBy: z.string().optional(),
          ink: z.string(),
        }),
      )
      .min(1),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('receipt'),
    merchant: z.string(),
    lines: z.array(z.string()).min(1),
    at: z.string(),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('map'),
    description: z.string(),
    points: z.array(z.object({ id: Id, label: z.string() })).min(2),
    travel: z
      .array(
        z.object({
          from: Id,
          to: Id,
          minutes: z.number().positive(),
          mode: z.string(),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal('statement'),
    suspectId: Id,
    interviewedAt: z.string(),
    lines: z
      .array(z.object({ n: z.number().int().positive(), text: z.string() }))
      .min(1),
  }),
  z.object({
    type: z.literal('audio'),
    lines: z
      .array(z.object({ t: z.string(), speaker: z.string(), text: z.string() }))
      .min(1),
    note: z.string().optional(),
  }),
  z.object({
    type: z.literal('phone'),
    owner: z.string(),
    messages: z
      .array(z.object({ thread: z.string(), messages: z.array(ChatMessage) }))
      .default([]),
    calls: z
      .array(
        z.object({
          at: z.string(),
          who: z.string(),
          dir: z.enum(['in', 'out', 'missed']),
          duration: z.string(),
        }),
      )
      .default([]),
    notes: z
      .array(z.object({ title: z.string(), text: z.string() }))
      .default([]),
    health: z.array(z.object({ t: z.string(), bpm: z.number() })).default([]),
    locations: z
      .array(z.object({ t: z.string(), place: z.string() }))
      .default([]),
  }),
]);
export type EvidenceBody = z.infer<typeof EvidenceBodySchema>;

export const EvidenceSchema = z.object({
  id: Id, // "E-04"
  tab: z.enum(['documents', 'photos', 'records', 'statements', 'phone']),
  number: z.number().int().positive(),
  title: z.string().min(1),
  source: z.string().min(1),
  body: EvidenceBodySchema,
  timestamps: z.array(TimestampSchema).default([]),
  gate: GateSchema.optional(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

export const SuspectSchema = z.object({
  id: Id,
  name: z.string(),
  role: z.string(),
  short: z.string(),
});

export const LeadSchema = z.object({
  id: Id,
  title: z.string(),
  costHours: z.number().positive(),
  gate: GateSchema.optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

export const WordSchema = z.object({
  id: Id,
  text: z.string(),
  /** Evidence or breakthrough ids. The word is available once ANY of them is read/found. Empty = always. */
  revealedBy: z.array(Id).default([]),
});
export type Word = z.infer<typeof WordSchema>;

const Blank = z.object({
  blankId: Id,
  prompt: z.string(),
  wordIds: z.array(Id).min(2),
});

export const CasePublicSchema = z.object({
  id: Id,
  version: z.number().int().positive(),
  title: z.string(),
  hook: z.string(),
  city: z.object({ name: z.string(), country: z.string() }),
  difficulty: z.number().int().min(1).max(5),
  estMinutes: z.tuple([z.number().int(), z.number().int()]),
  contentNotes: z.array(z.string()),
  parHours: z.number().positive(),
  briefing: z.string().min(1),
  suspects: z.array(SuspectSchema).min(2),
  evidence: z.array(EvidenceSchema).min(1),
  leads: z.array(LeadSchema),
  archive: z.object({ label: z.string(), placeholder: z.string() }),
  words: z.array(WordSchema),
  verdict: z.object({
    who: z.array(z.object({ blankId: Id, prompt: z.string() })).min(1),
    how: z.array(Blank).min(1),
    why: z.array(Blank).min(1),
    proofCount: z.literal(3),
  }),
  nudges: z.array(z.object({ stuckPointId: Id, text: z.string() })),
});
export type CasePublic = z.infer<typeof CasePublicSchema>;

export const RelationSchema = z.enum([
  'contradiction',
  'corroboration',
  'link',
]);
export type Relation = z.infer<typeof RelationSchema>;

export const CaseSolutionSchema = z.object({
  caseId: Id,
  version: z.number().int().positive(),
  breakthroughs: z.array(
    z.object({
      id: Id,
      a: Id,
      b: Id,
      relation: RelationSchema,
      insight: z.string(),
      essential: z.boolean(),
      order: z.number().int(),
    }),
  ),
  confrontations: z.array(
    z.object({
      id: Id,
      statementId: Id,
      line: z.number().int().positive(),
      evidenceIds: z.array(Id).min(1),
      revealLines: z
        .array(z.object({ n: z.string(), text: z.string() }))
        .min(1),
    }),
  ),
  archiveIndex: z.array(
    z.object({ evidenceId: Id, terms: z.array(z.string().min(2)).min(1) }),
  ),
  verdict: z.object({
    who: z.record(Id, Id),
    how: z.record(Id, z.array(Id).min(1)),
    why: z.record(Id, z.array(Id).min(1)),
    proof: z.object({ core: z.array(Id), support: z.array(Id) }),
  }),
  hints: z.array(
    z.object({ stuckPointId: Id, pointer: z.string(), reveal: z.string() }),
  ),
  debrief: z
    .array(
      z.object({ step: z.number().int(), time: z.string(), text: z.string() }),
    )
    .min(1),
});
export type CaseSolution = z.infer<typeof CaseSolutionSchema>;
