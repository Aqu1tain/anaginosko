import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import YAML from 'js-yaml';

const source = readFileSync(new URL('../deploy/preprod/deploy-actions.sh', import.meta.url), 'utf8');
const timestamp = '20260917120000';
function fixture(t, action, { fail = '', validation = false, ts = timestamp } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'anag-next-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, 'web');
  const data = join(dir, 'data');
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  mkdirSync(join(root, 'arbitration'), { recursive: true });
  if (validation) writeFileSync(join(root, 'arbitration/lxx-biblion-validated.json'), '{}');
  const log = join(dir, 'calls');
  for (const command of ['sudo', 'ln', 'id']) {
    const file = join(bin, command);
    writeFileSync(file, `#!${process.execPath}\n` + `
      const fs = require('node:fs');
      const args = process.argv.slice(2);
      if ('${command}' === 'id') { process.stdout.write('deploytest\\n'); process.exit(0); }
      fs.appendFileSync(process.env.CALLS, JSON.stringify(['${command}', ...args]) + '\\n');
      if (process.env.FAIL && args.some(a => a.includes(process.env.FAIL))) process.exit(9);
    `);
    chmodSync(file, 0o755);
  }
  const script = join(dir, 'actions.sh');
  writeFileSync(script, source.replace('WEB_ROOT=/opt/anaginosko-web-next', `WEB_ROOT=${root}`)
    .replace('DATA_DIR=/var/www/anaginosko-next', `DATA_DIR=${data}`));
  const result = spawnSync('bash', [script, action, ts], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CALLS: log, FAIL: fail }, encoding: 'utf8',
  });
  let calls = [];
  try { calls = readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return { ...result, calls, root, data };
}

test('reject invalid action or timestamp before invoking sudo', t => {
  for (const [action, ts] of [['unknown', timestamp], ['activate', '../prod'], ['activate', '2026;id']]) {
    const result = fixture(t, action, { ts });
    assert.equal(result.status, 2);
    assert.deepEqual(result.calls, []);
  }
});
test('prepare data without following symlinks and without provisioning', t => {
  const r = fixture(t, 'prepare-data');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.calls, [['sudo', '-n', '/usr/bin/chown', '-hR', '-P', '--',
    'deploytest:deploytest', `${r.data}/nt`, `${r.data}/lxx`]]);
});
test('backup denial prevents the arbitration merge', t => {
  const r = fixture(t, 'merge-arbitration', { fail: '/usr/bin/cp' });
  assert.equal(r.status, 9);
  assert.equal(r.calls.length, 1);
});
test('backups and Node execute as the service account, never root', t => {
  const r = fixture(t, 'merge-arbitration');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.calls.length, 2);
  assert.deepEqual(r.calls.map(c => c.slice(0, 5)), [
    ['sudo', '-n', '-u', 'anag-web', '/usr/bin/cp'],
    ['sudo', '-n', '-u', 'anag-web', '/usr/bin/node'],
  ]);
  assert.ok(r.calls[1].includes(`${r.root}/releases/${timestamp}/scripts/merge-arb-git-server.mjs`));
});
test('absent validations are optional, a failed backup is not', t => {
  const absent = fixture(t, 'backup-validation');
  assert.equal(absent.status, 0);
  assert.deepEqual(absent.calls, []);
  const denied = fixture(t, 'backup-validation', { validation: true, fail: '/usr/bin/cp' });
  assert.equal(denied.status, 9);
});
test('activation stops before switching the release if ownership fails', t => {
  const r = fixture(t, 'activate', { fail: '/usr/bin/chown' });
  assert.equal(r.status, 9);
  assert.equal(r.calls.length, 1);
});
test('activation restores ownership, switches release and restarts only preprod', t => {
  const r = fixture(t, 'activate');
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(r.calls.map(c => c[0]), ['sudo', 'ln', 'sudo']);
  assert.deepEqual(r.calls[2], ['sudo', '-n', '/usr/bin/systemctl', 'restart', 'anaginosko-web-next']);
});
test('manual provisioning is opt-in and ordinary pushes cannot request it', () => {
  const workflow = YAML.load(readFileSync(new URL('../.github/workflows/deploy-preprod.yml', import.meta.url), 'utf8'));
  const input = workflow.on.workflow_dispatch.inputs.provision;
  assert.equal(input.type, 'boolean');
  assert.equal(input.default, false);
  const deploy = workflow.jobs.deploy.steps.find(step => step.name === 'Deploy preprod to VPS');
  assert.equal(deploy.env.RUN_PROVISION, "${{ github.event_name == 'workflow_dispatch' && inputs.provision }}");
  assert.match(deploy.run, /if \[ "\$RUN_PROVISION" = "true" \]; then\s+\$SSH[^\n]*provision\.sh"\s+fi/);
  assert.equal((deploy.run.match(/provision\.sh/g) || []).length, 1);
  assert.ok(deploy.run.indexOf('prepare-data') < deploy.run.indexOf('public/nt/'));
});
test('sudoers arguments allow the generated commands and reject production or extra arguments', t => {
  const policy = readFileSync(new URL('../deploy/preprod/deploy.sudoers.in', import.meta.url), 'utf8');
  const regexes = [...policy.matchAll(/\/usr\/bin\/(cp|node) (\^[^\n,]+\$)/g)]
    .map(([, command, pattern]) => ({ command: `/usr/bin/${command}`, regex: new RegExp(pattern) }));
  assert.equal(regexes.length, 3);
  for (const action of ['merge-arbitration', 'backup-validation']) {
    const r = fixture(t, action, { validation: true });
    for (const call of r.calls) {
      const args = call.slice(5).join(' ').replaceAll(r.root, '/opt/anaginosko-web-next');
      assert.ok(regexes.some(p => p.command === call[4] && p.regex.test(args)), args);
      for (const bad of [args + ' --extra', args.replaceAll('anaginosko-web-next', 'anaginosko-web'), args.replace(timestamp, '../main')]) {
        assert.ok(!regexes.some(p => p.regex.test(bad)), bad);
      }
    }
  }
  assert.match(policy, /ALL=\(anag-web\) NOPASSWD: ANAG_NEXT_BACKUP, ANAG_NEXT_MERGE/);
  assert.match(policy, /ALL=\(root\) NOPASSWD: ANAG_NEXT_DATA, ANAG_NEXT_RESTART/);
});

test('preprod Compose preserves the exact limits recorded on the VPS', () => {
  const compose = YAML.load(readFileSync(new URL('../deploy/preprod/docker-compose.preprod.yml', import.meta.url), 'utf8'));
  const api = compose.services.api;
  assert.equal(api.mem_limit, '512m');
  assert.equal(api.memswap_limit, '1024m');
  assert.equal(api.cpus, 1);
  assert.equal(api.pids_limit, 512);
  assert.deepEqual(api.logging, { driver: 'json-file', options: { 'max-size': '20m', 'max-file': '3' } });
});
