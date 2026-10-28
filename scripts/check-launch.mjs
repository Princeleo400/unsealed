/**
 * Pre-launch check: things that must be filled in before UNSEALED takes real players
 * and payments. Run with `pnpm launch:check`; exits with an error while anything is left.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const problems = [];

const legal = JSON.parse(
  readFileSync(join(root, 'apps/web/src/config/legal.json'), 'utf8'),
);
for (const field of ['publisher', 'supportEmail'])
  if (/^\[.*\]$/.test(String(legal[field]).trim()))
    problems.push(
      `apps/web/src/config/legal.json: "${field}" is still ${legal[field]}`,
    );
if (legal.supportEmail && !/^\[/.test(legal.supportEmail))
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(legal.supportEmail))
    problems.push(
      `apps/web/src/config/legal.json: "supportEmail" doesn't look like an email address`,
    );

if (problems.length) {
  console.error('✗ Not ready to launch:');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('✓ launch check: legal details are filled in');
