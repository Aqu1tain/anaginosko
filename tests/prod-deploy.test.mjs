import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, symlinkSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import YAML from 'js-yaml';

const workflow = YAML.load(readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8'));
const deploy = workflow.jobs.deploy.steps.find(step => step.name === 'Deploy to VPS').run;
const check = deploy.match(/<<'CHECK_ARTICLES'\n([\s\S]*?)\nCHECK_ARTICLES/)[1];

function runCheck(t, { missing = false, symlink = false, owner = 'anag-web:anag-web' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'anag-prod-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const articles = join(root, 'articles');
  mkdirSync(articles);
  for (const dir of ['articles', 'uploads', 'profiles']) {
    if (dir === 'profiles' && missing) continue;
    if (dir === 'profiles' && symlink) symlinkSync(join(articles, 'uploads'), join(articles, dir));
    else mkdirSync(join(articles, dir));
  }
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const stat = join(bin, 'stat');
  writeFileSync(stat, '#!/bin/sh\nprintf "%s\\n" "$TEST_OWNER"\n');
  chmodSync(stat, 0o755);
  return spawnSync('bash', ['-se'], {
    input: check.replaceAll('/opt/anaginosko-web/articles', articles),
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_OWNER: owner }, encoding: 'utf8',
  });
}

test('provisioned editorial directories pass the unprivileged check', t => {
  const r = runCheck(t); assert.equal(r.status, 0, r.stderr);
});
test('missing editorial directory stops deployment', t => {
  const r = runCheck(t, { missing: true }); assert.equal(r.status, 1); assert.match(r.stderr, /absent/);
});
test('symbolic link in place of an editorial directory is rejected', t => {
  const r = runCheck(t, { symlink: true }); assert.equal(r.status, 1); assert.match(r.stderr, /lien symbolique/);
});
test('wrong owner stops deployment without attempting to repair ownership', t => {
  const r = runCheck(t, { owner: 'anag-deploy:anag-deploy' }); assert.equal(r.status, 1);
  assert.match(r.stderr, /Propriétaire éditorial incorrect/);
  assert.doesNotMatch(check, /\bsudo\b|\bchmod\b|\bchown\b|\bmkdir\b/);
});
test('privileged commands match the installed production contract', () => {
  const commands = [...deploy.matchAll(/\bsudo\s+[^"\n]+/g)].map(match => match[0]);
  assert.deepEqual(commands, [
    'sudo -n chown -hR -P -- anag-web:anag-web $REL/.next',
    'sudo -n systemctl restart anaginosko-web',
    'sudo -n /usr/local/sbin/anag-web-purge-releases',
  ]);
  assert.match(deploy, /TS=\$\(date \+%Y%m%d%H%M%S\)/);
  assert.match(deploy, /REL="\/opt\/anaginosko-web\/releases\/\$TS"/);
  assert.doesNotMatch(deploy, /ssh -t|xargs.*sudo.*rm/);
});
test('production corpus transfers remain restricted to explicit manual dispatch', () => {
  assert.equal(workflow.on.workflow_dispatch.inputs.deploy_corpus.default, false);
  assert.match(deploy, /if \[ "\$\{\{ github.event_name \}\}" = "workflow_dispatch" \] && \[ "\$\{\{ inputs.deploy_corpus \}\}" = "true" \]; then\s+rsync/);
  assert.match(deploy, /for FILE in lxx-arbitration\.json lxx-biblion-validated\.json/);
});
test('complete deployment shell remains syntactically valid', () => {
  const r = spawnSync('bash', ['-n'], { input: deploy.replace(/\$\{\{[\s\S]*?\}\}/g, 'test-value'), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
