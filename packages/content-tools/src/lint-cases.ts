import { lintCase } from '@unsealed/engine';
import { loadCases } from './load';

let errors = 0;
for (const rawCase of loadCases(process.argv[2])) {
  const { issues } = lintCase(rawCase.pub, rawCase.sol);
  const errs = issues.filter((lintIssue) => lintIssue.level === 'error');
  const warns = issues.filter((lintIssue) => lintIssue.level === 'warning');
  console.log(
    `\n${errs.length ? '✗' : '✓'} ${rawCase.slug} — ${errs.length} error(s), ${warns.length} warning(s)`,
  );
  for (const lintIssue of issues)
    console.log(
      `  ${lintIssue.level === 'error' ? 'ERROR' : 'warn '} [${lintIssue.code}] ${lintIssue.message}`,
    );
  errors += errs.length;
}
process.exit(errors ? 1 : 0);
