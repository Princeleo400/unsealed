import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const CASES_DIR = resolve(here, '../../../content/cases');

export type RawCase = { dir: string; slug: string; pub: unknown; sol: unknown };

export function loadCases(only?: string): RawCase[] {
  return readdirSync(CASES_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() && (!only || dirent.name === only))
    .map((dirent) => {
      const dir = join(CASES_DIR, dirent.name);
      const pubPath = join(dir, 'case.json');
      const solPath = join(dir, 'solution.json');
      if (!existsSync(pubPath) || !existsSync(solPath))
        throw new Error(`${dirent.name}: needs case.json and solution.json`);
      return {
        dir,
        slug: dirent.name,
        pub: JSON.parse(readFileSync(pubPath, 'utf8')),
        sol: JSON.parse(readFileSync(solPath, 'utf8')),
      };
    });
}
