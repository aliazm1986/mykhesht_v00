import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { resolvePersistDir } from './persist-dir.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

let generated;
try {
  generated = JSON.parse(await readFile(path.join(root, 'dist/server/wrangler.json'), 'utf8'));
} catch {
  throw Error('Run npm run build before npm run db:local.');
}

const databases = (generated.d1_databases ?? []).map((db) => ({
  ...db,
  migrations_dir: path.join(root, 'drizzle'),
}));
if (!databases.some((db) => db.binding === 'DB')) {
  throw Error('The built Worker does not declare DB.');
}

const persistDir = resolvePersistDir(root);
await mkdir(persistDir, { recursive: true });
const config = path.join(persistDir, 'local-migrations.json');
await writeFile(
  config,
  JSON.stringify(
    {
      name: 'khesht-local-migrations',
      compatibility_date: generated.compatibility_date,
      d1_databases: databases,
    },
    null,
    2,
  ),
);

const sitesEnvUrl = pathToFileURL(path.join(root, 'scripts/sites-env.mjs')).href;
const result = spawnSync(
  process.execPath,
  [
    '--import',
    sitesEnvUrl,
    path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
    'd1',
    'migrations',
    'apply',
    'DB',
    '--local',
    '--config',
    config,
    '--persist-to',
    path.join(persistDir, 'state'),
  ],
  {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      CI: '1',
      WRANGLER_SEND_METRICS: 'false',
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
