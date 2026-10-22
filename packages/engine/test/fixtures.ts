import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CasePublicSchema, CaseSolutionSchema } from '../src/schema';

const dir = resolve(__dirname, '../../../content/cases/001-dead-air');
export const pub = CasePublicSchema.parse(JSON.parse(readFileSync(resolve(dir, 'case.json'), 'utf8')));
export const sol = CaseSolutionSchema.parse(JSON.parse(readFileSync(resolve(dir, 'solution.json'), 'utf8')));
export const rawPub = () => JSON.parse(readFileSync(resolve(dir, 'case.json'), 'utf8'));
export const rawSol = () => JSON.parse(readFileSync(resolve(dir, 'solution.json'), 'utf8'));
