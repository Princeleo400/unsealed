import { runGolden } from '@unsealed/engine/src/golden';
import { loadCases } from './load';

let failed = 0;
for (const c of loadCases(process.argv[2])) {
  const r = runGolden(c.pub, c.sol);
  if (!r.ok) {
    failed++;
    console.log(`✗ ${c.slug}: ${r.reason}`);
    continue;
  }
  const { run } = r;
  const h = Math.floor(run.state.clockMinutes / 60);
  const m = run.state.clockMinutes % 60;
  console.log(`✓ ${c.slug}: solved 4/4 · clock ${h}h ${m}m (ideal bot follows every lead) · score ${run.score.total} · badges ${run.score.badges.join(', ') || 'none'}`);
  console.log(`  path: ${run.log.join(' → ')}`);
}
process.exit(failed ? 1 : 0);
