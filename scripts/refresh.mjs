// Promote exactly one validated snapshot only after collection, tests and build succeed.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

mkdirSync('data', { recursive: true });
const lock = 'data/.refresh.lock';
let descriptor;
const run = (command, args, extraEnv = {}) => {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed`);
};
try {
  descriptor = openSync(lock, 'wx');
  const candidateArgument = process.argv.indexOf('--candidate');
  let candidate = resolve('data/candidate.json');
  if (candidateArgument >= 0) {
    if (!process.argv[candidateArgument + 1]) throw new Error('--candidate requires a path');
    candidate = resolve(process.argv[candidateArgument + 1]);
  } else run('python3', ['scripts/collect.py']);
  if (candidate === resolve('public/data/statutes.json')) throw new Error('Candidate must be separate from the live dataset');
  run('python3', ['scripts/collect.py', '--validate', candidate]);
  const fresh = JSON.parse(readFileSync(candidate, 'utf8'));
  const old = JSON.parse(readFileSync('public/data/statutes.json', 'utf8'));
  const prior = new Map((old.records ?? []).map(r => [r.id, r]));
  const next = new Map(fresh.records.map(r => [r.id, r]));
  const removed = [...prior.keys()].filter(id => !next.has(id));
  const semantic = r => JSON.stringify([r.section, r.title, r.chapter, r.effectiveFrom, r.effectiveTo, r.sourceUrl, r.headingMarker, r.multipleEnactments]);
  const report = {
    previousSourceCheck: old.manifest?.collectedAt ?? null,
    nextSourceCheck: fresh.manifest.collectedAt,
    added: [...next.keys()].filter(id => !prior.has(id)), removed,
    changed: [...next.keys()].filter(id => prior.has(id) && semantic(prior.get(id)) !== semantic(next.get(id))),
  };
  writeFileSync('data/change-report.json', JSON.stringify(report, null, 2) + '\n');
  if (removed.length) throw new Error('Record loss blocks promotion; inspect data/change-report.json');
  run('python3', ['-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_*.py']);
  const env = { STATUTES_DATASET: candidate };
  run('npm', ['test'], env);
  run('npm', ['run', 'build'], env);
  // Same filesystem rename makes the single dataset+manifest replacement atomic.
  writeFileSync('public/data/statutes.json.next', readFileSync(candidate));
  renameSync('public/data/statutes.json.next', 'public/data/statutes.json');
  console.log('Validated snapshot promoted locally. No hosting, DNS, or publication action was performed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (descriptor !== undefined) { closeSync(descriptor); unlinkSync(lock); }
}
