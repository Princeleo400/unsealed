import { runGolden } from '@unsealed/engine/src/golden';
import { loadCases } from './load';

let failed = 0;
for (const rawCase of loadCases(process.argv[2])) {
  const outcome = runGolden(rawCase.pub, rawCase.sol);
  if (!outcome.ok) {
    failed++;
    console.log(`✗ ${rawCase.slug}: ${outcome.reason}`);
    continue;
  }
  const { run } = outcome;
  const hours = Math.floor(run.state.clockMinutes / 60);
  const minutes = run.state.clockMinutes % 60;
  console.log(
    `✓ ${rawCase.slug}: solved 4/4 · clock ${hours}h ${minutes}m (ideal bot follows every lead) · score ${run.score.total} · badges ${run.score.badges.join(', ') || 'none'}`,
  );
  console.log(`  path: ${run.log.join(' → ')}`);
}
process.exit(failed ? 1 : 0);
