/**
 * Fails if any variable, parameter or destructured name is a single letter.
 * Readable names only (team rule). Run with: pnpm lint:names
 * Allowed: `_` for intentionally unused values. Data fields from the case-file
 * format (a, b, n, t) are object properties, not variables, so they are not checked.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const root = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', '.next', 'dist', 'coverage', '.data']);
const EXTENSIONS = /\.(ts|tsx|mts|js|mjs)$/;

function sourceFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    if (SKIP.has(entry)) continue;
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...sourceFiles(path));
    else if (EXTENSIONS.test(entry) && !entry.endsWith('.d.ts'))
      found.push(path);
  }
  return found;
}

const problems = [];
for (const folder of ['apps', 'packages', 'supabase', 'scripts']) {
  for (const path of sourceFiles(join(root, folder))) {
    const text = readFileSync(path, 'utf8');
    const kind = path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const file = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      kind,
    );
    const visit = (node) => {
      const isNamed =
        ts.isVariableDeclaration(node) ||
        ts.isParameter(node) ||
        ts.isBindingElement(node);
      if (isNamed && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (name.length === 1 && name !== '_') {
          const { line } = file.getLineAndCharacterOfPosition(
            node.name.getStart(),
          );
          problems.push(`${relative(root, path)}:${line + 1}  "${name}"`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
}

if (problems.length) {
  console.error(
    `Single-letter names found (use a readable name):\n${problems.join('\n')}`,
  );
  process.exit(1);
}
console.log('✓ names: no single-letter variables or parameters');
