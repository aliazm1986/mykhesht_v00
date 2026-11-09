import { existsSync, mkdirSync, accessSync, constants } from 'node:fs';
import path from 'node:path';

export function resolvePersistDir(root) {
  if (process.env.KHESHT_DATA_DIR) {
    mkdirSync(process.env.KHESHT_DATA_DIR, { recursive: true });
    return process.env.KHESHT_DATA_DIR;
  }
  if (process.platform !== 'win32' && existsSync('/data')) {
    try {
      accessSync('/data', constants.W_OK);
      const d = '/data/.wrangler';
      mkdirSync(d, { recursive: true });
      return d;
    } catch {
      // fallback to root/.wrangler
    }
  }
  const localDir = path.join(root, '.wrangler');
  mkdirSync(localDir, { recursive: true });
  return localDir;
}
