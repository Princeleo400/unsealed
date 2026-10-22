import 'server-only';
import { CasePublicSchema, CaseSolutionSchema, lintCase, type CasePublic, type CaseSolution } from '@unsealed/engine';
// Solutions are imported here, in server-only code. `server-only` makes the build fail
// if any client component ever imports this module (BRD BR-9).
import pub001 from '../../../../content/cases/001-dead-air/case.json';
import sol001 from '../../../../content/cases/001-dead-air/solution.json';
import pub002 from '../../../../content/cases/002-the-last-toast/case.json';
import sol002 from '../../../../content/cases/002-the-last-toast/solution.json';

type LoadedCase = { pub: CasePublic; sol: CaseSolution };

function load(rawPub: unknown, rawSol: unknown): LoadedCase {
  const errors = lintCase(rawPub, rawSol).issues.filter((i) => i.level === 'error');
  if (errors.length) throw new Error(`Case failed lint: ${errors.map((e) => e.message).join('; ')}`);
  return { pub: CasePublicSchema.parse(rawPub), sol: CaseSolutionSchema.parse(rawSol) };
}

const CASES: Record<string, LoadedCase> = {
  '001-dead-air': load(pub001, sol001),
  '002-the-last-toast': load(pub002, sol002),
};

export function getCase(slug: string): LoadedCase | null {
  return CASES[slug] ?? null;
}

export function playableSlugs(): string[] {
  return Object.keys(CASES);
}
