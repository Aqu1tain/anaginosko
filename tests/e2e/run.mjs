import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { runEditorialHttp } from './workflow.mjs';

const web = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const api = path.resolve(process.env.E2E_API_DIR || path.join(web, '../api-editorial-workflow'));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'anag-editorial-e2e-'));
const children = [];
const logFiles = [];
const webPort = Number(process.env.E2E_WEB_PORT || 3299);
const apiPort = Number(process.env.E2E_API_PORT || 3433);
for (const port of [webPort, apiPort]) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port local invalide');
}
const base = `http://127.0.0.1:${webPort}`;
// Ne copie ni fichier d’environnement, ni base, ni articles, ni secrets ignorés.
function snapshot(source, target) {
  execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: source });
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: source, maxBuffer: 20 * 1024 * 1024 }).toString().split('\0');
  fs.mkdirSync(target);
  for (const name of files) {
    if (!name || name.split('/').some(p => p.startsWith('.env')) || !fs.existsSync(path.join(source, name))) continue;
    const output = path.join(target, name);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(source, name), output);
  }
  fs.symlinkSync(path.join(source, 'node_modules'), path.join(target, 'node_modules'), 'dir');
  fs.mkdirSync(path.join(target, 'tmp'));
}
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: os.tmpdir(),
  NODE_ENV: 'test', ENV_PATH: path.join(root, 'empty-env'),
  HOST: '127.0.0.1', PORT: String(apiPort), LOG_LEVEL: 'error',
  APP_KEY: 'local-editorial-e2e-key-not-secret', EDITORIAL_E2E: '1',
  RESEND_API_KEY: 'fake-e2e-key', APP_URL: base,
  MAIL_FROM: 'test@example.test', E2E_MAIL_LOG: path.join(root, 'mail.jsonl'),
};
function command(cwd, args) {
  execFileSync(process.execPath, args, { cwd, env, stdio: 'pipe', timeout: 120000 });
}
function server(cwd, args, overrides, name) {
  const log = path.join(root, `${name}.log`); logFiles.push(log);
  const fd = fs.openSync(log, 'w');
  const child = spawn(process.execPath, args, { cwd, env: { ...env, ...overrides }, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd); children.push(child); return child;
}
async function ready(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Serveur arrêté (${child.exitCode})`);
    try { if ((await fetch(url, { signal: AbortSignal.timeout(2000) })).ok) return; } catch { /* démarrage */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Délai de démarrage dépassé');
}
try {
  fs.mkdirSync(env.ENV_PATH);
  snapshot(api, path.join(root, 'api')); snapshot(web, path.join(root, 'web'));
  command(path.join(root, 'api'), ['ace', 'migration:run', '--force']);
  fs.copyFileSync(path.join(root, 'api/tests/helpers/editorial_seed.ts'), path.join(root, 'api/database/seeders/editorial_e2e.ts'));
  command(path.join(root, 'api'), ['ace', 'db:seed', '--files', 'database/seeders/editorial_e2e.ts']);
  const backend = server(path.join(root, 'api'), ['--import', './tests/helpers/editorial_mail_mock.mjs', '--import', 'ts-node-maintained/register/esm', 'bin/server.ts'], {}, 'api');
  await ready(`http://127.0.0.1:${apiPort}/`, backend);
  const frontend = server(path.join(root, 'web'), ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(webPort)], {
    NODE_ENV: 'development', PORT: String(webPort), NEXT_TELEMETRY_DISABLED: '1',
    API_PROXY: `http://127.0.0.1:${apiPort}`, ARB_API_URL: `http://127.0.0.1:${apiPort}/api`,
    NEXT_PUBLIC_API_BASE: '/api', ARTICLES_DIR: path.join(root, 'articles'),
  }, 'web');
  await ready(`${base}/api/pronunciations`, frontend);
  await runEditorialHttp(base, env.E2E_MAIL_LOG);
  if (process.argv.includes('--serve')) {
    console.log(`Recette navigateur disponible : ${base} ; comptes *@example.test ; mot de passe de fixture local-e2e-password`);
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
  }
} catch (error) {
  console.error(error.message);
  if (error.stdout) console.error(error.stdout.toString().slice(-3000));
  for (const log of logFiles) console.error(fs.readFileSync(log, 'utf8').slice(-4000));
  process.exitCode = 1;
} finally {
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill('SIGTERM');
      await Promise.race([new Promise(resolve => child.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 5000))]);
      if (child.exitCode === null) { child.kill('SIGKILL'); await new Promise(resolve => child.once('exit', resolve)); }
    }
  }
  // Next peut terminer une dernière écriture de cache pendant son arrêt.
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
