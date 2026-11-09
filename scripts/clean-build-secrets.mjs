import { existsSync } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

async function clean(dir) {
  if (!existsSync(dir)) return;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await clean(p);
    else if (entry.name === '.dev.vars' || entry.name.startsWith('.dev.vars.')) await rm(p, { force: true });
  }
}
await clean(path.join(root, 'dist'));
