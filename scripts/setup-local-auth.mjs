import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

if (!process.stdin.isTTY) throw Error('Run interactively: npm run auth:setup');
let muted = false;
const output = new Writable({
  write(chunk, _encoding, callback) {
    if (!muted) process.stdout.write(chunk);
    callback();
  },
});
const rl = createInterface({ input: process.stdin, output, terminal: true });
try {
  const email = (await rl.question('Owner email (default: owner@khesht.test): ')).trim().toLowerCase() || 'owner@khesht.test';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Valid email required.');
  process.stdout.write('Password (at least 16 characters; hidden): ');
  muted = true;
  const password = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  if (password.length < 16 || password.length > 128) throw Error('Password must contain 16–128 characters.');
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  const values = {
    KHESHT_AUTH_MODE: 'local-session',
    KHESHT_LOCAL_OWNER_EMAIL: email,
    KHESHT_LOCAL_PASSWORD_HASH: `pbkdf2-sha256:100000:${salt}:${hash}`,
    KHESHT_BOOTSTRAP_ADMIN_USER_ID: 'local-owner-' + randomBytes(12).toString('hex'),
  };
  await writeFile('.dev.vars', Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { flag: 'w', mode: 0o600 });
  await mkdir(path.join(root, '.wrangler'), { recursive: true });
  await writeFile(
    path.join(root, '.wrangler/local-credentials.txt'),
    `URL: http://127.0.0.1:5173/auth\nEmail: ${email}\nPassword: (custom password set via auth:setup)\n`,
    { mode: 0o600 },
  );
  console.log('Local authentication configured. Run npm run local or npm run dev. Keep .dev.vars private.');
} finally {
  muted = false;
  rl.close();
}
