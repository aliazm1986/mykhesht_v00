import { existsSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { resolvePersistDir } from './persist-dir.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const persistDir = resolvePersistDir(root);
const persistedVars = path.join(persistDir, '.dev.vars');
const rootVars = path.join(root, '.dev.vars');
if (!existsSync(rootVars) && existsSync(persistedVars)) {
  try {
    copyFileSync(persistedVars, rootVars);
  } catch {
    // ignore
  }
}

if (
  !existsSync(rootVars) ||
  !existsSync(path.join(root, 'dist/server/wrangler.json')) ||
  !existsSync(path.join(persistDir, 'local-migrations.json'))
) {
  const setup = spawnSync(process.execPath, [path.join(root, 'scripts/local-workspace.mjs'), 'setup'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (setup.error) throw setup.error;
  if (setup.signal || setup.status !== 0) process.exit(setup.status || 1);
}

const defaultPort = process.env.KHESHT_LOCAL_WORKSPACE === '1' ? '5173' : '3000';
const host = process.env.HOST || '0.0.0.0';
const port = String(process.env.PORT || defaultPort);

const sitesEnvUrl = pathToFileURL(path.join(root, 'scripts/sites-env.mjs')).href;
const args = [
  '--import',
  sitesEnvUrl,
  path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
  'dev',
  '--config',
  'dist/server/wrangler.json',
  '--local',
  '--persist-to',
  path.join(persistDir, 'state'),
  '--ip',
  host,
  '--port',
  port,
  '--inspector-port',
  '0',
];
if (existsSync(rootVars)) {
  args.push('--env-file', rootVars);
}
console.log(`\n[Khesht Server] Starting on http://${host}:${port} (Storage: ${persistDir})...\n`);
const r = spawnSync(process.execPath, args, {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI || '1',
    WRANGLER_SEND_METRICS: 'false',
  },
});
if (r.error) throw r.error;
process.exitCode = r.status ?? 1;
