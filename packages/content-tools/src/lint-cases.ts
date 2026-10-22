import { lintCase } from '@unsealed/engine';
import { loadCases } from './load';

let errors = 0;
for (const c of loadCases(process.argv[2])) {
  const { issues } = lintCase(c.pub, c.sol);
  const errs = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warning');
  console.log(`\n${errs.length ? '✗' : '✓'} ${c.slug} — ${errs.length} error(s), ${warns.length} warning(s)`);
  for (const i of issues) console.log(`  ${i.level === 'error' ? 'ERROR' : 'warn '} [${i.code}] ${i.message}`);
  errors += errs.length;
}
process.exit(errors ? 1 : 0);
