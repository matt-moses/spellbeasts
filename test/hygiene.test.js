import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const run = (root) => spawnSync('bash', ['tools/hygiene.sh'], { env: { ...process.env, HYGIENE_ROOT: root } });

test('hygiene scanner fails on a planted franchise term', () => {
  const d = mkdtempSync(join(tmpdir(), 'hyg-'));
  writeFileSync(join(d, 'bad.js'), '// a Pikachu clone\n');
  assert.notEqual(run(d).status, 0);
});

test('hygiene scanner passes clean content', () => {
  const d = mkdtempSync(join(tmpdir(), 'hyg-'));
  writeFileSync(join(d, 'ok.js'), '// a friendly marsh drake\n');
  assert.equal(run(d).status, 0);
});
