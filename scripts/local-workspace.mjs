import { resolvePersistDir } from './persist-dir.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
const mode = process.argv[2] ?? 'run';
if (!['run', 'dev', 'setup', 'reset-auth'].includes(mode)) {
  throw new Error('Unknown local mode. Expected: run, dev, setup, or reset-auth.');
}

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 19)) {
  console.error('Node.js 20.19+ or 22+ is required. Restart VS Code after installing Node.');
  process.exit(1);
}

function runNodeScript(script, args = [], extraEnv = {}) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
  if (result.error) throw result.error;
  if (result.signal || result.status !== 0) process.exit(result.status || 1);
}

function ensureDependencies() {
  if (existsSync('node_modules/vinext/package.json') && existsSync('node_modules/wrangler/bin/wrangler.js')) {
    return;
  }
  console.log('\nDependencies are missing. Running npm ci automatically...\n');
  const env = { ...process.env, SHARP_IGNORE_GLOBAL_LIBVIPS: process.env.SHARP_IGNORE_GLOBAL_LIBVIPS || '1' };
  const npmExec = process.env.npm_execpath;
  const npmArgs = ['ci', '--prefix', root, '--workspaces=false', '--include=dev', '--include=optional', '--no-audit', '--no-fund'];
  let result;
  if (npmExec && /\.[cm]?js$/i.test(npmExec) && existsSync(npmExec)) {
    result = spawnSync(process.execPath, [npmExec, ...npmArgs], { cwd: root, stdio: 'inherit', env });
  } else {
    const bundledNpmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
    if (existsSync(bundledNpmCli)) {
      result = spawnSync(process.execPath, [bundledNpmCli, ...npmArgs], { cwd: root, stdio: 'inherit', env });
    } else {
      result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', npmArgs, {
        cwd: root,
        stdio: 'inherit',
        env,
        shell: process.platform === 'win32',
      });
    }
  }
  if (result.error) throw result.error;
  if (result.signal || result.status !== 0) process.exit(result.status || 1);
}

ensureDependencies();

const credentialsFile = path.join(root, '.wrangler', 'local-credentials.txt');

function createLocalCredentials(overwrite = false) {
  const email = process.env.KHESHT_LOCAL_OWNER_EMAIL || 'owner@khesht.test';
  const password = process.env.KHESHT_ADMIN_PASSWORD || 'Khesht1405!';
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  const values = {
    KHESHT_AUTH_MODE: 'local-session',
    KHESHT_LOCAL_OWNER_EMAIL: email,
    KHESHT_LOCAL_PASSWORD_HASH: `pbkdf2-sha256:100000:${salt}:${hash}`,
    KHESHT_BOOTSTRAP_ADMIN_USER_ID: process.env.KHESHT_BOOTSTRAP_ADMIN_USER_ID || 'local-owner-admin',
    KHESHT_DEFAULT_DEMO_SESSION: '1',
  };
  const formatted = Object.entries(values).map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
  writeFileSync('.dev.vars', formatted, { flag: overwrite ? 'w' : 'wx', mode: 0o600 });
  const persistDir = resolvePersistDir(root);
  mkdirSync(persistDir, { recursive: true });
  writeFileSync(path.join(persistDir, '.dev.vars'), formatted, { mode: 0o600 });
  writeFileSync(
    credentialsFile,
    `URL: http://127.0.0.1:5173/auth\nEmail: ${email}\nPassword: ${password}\n`,
    { mode: 0o600 },
  );
  return { email, password, created: true };
}

let accountInfo = null;

if (mode === 'reset-auth') {
  accountInfo = createLocalCredentials(true);
  console.log('\n============================================================');
  console.log('Local admin credentials have been reset:');
  console.log(`URL:      http://127.0.0.1:5173/auth`);
  console.log(`Email:    ${accountInfo.email}`);
  console.log(`Password: ${accountInfo.password}`);
  console.log('============================================================\n');
  process.exit(0);
}

if (!existsSync('.dev.vars')) {
  accountInfo = createLocalCredentials(false);
} else {
  const existingVars = readFileSync('.dev.vars', 'utf8');
  if (!/^KHESHT_AUTH_MODE\s*=\s*["']?local-session["']?\s*$/m.test(existingVars)) {
    const hasActiveSettings = existingVars
      .split(/\r?\n/)
      .some((line) => line.trim() && !line.trim().startsWith('#'));
    if (!hasActiveSettings) {
      accountInfo = createLocalCredentials(true);
    } else {
      console.error('Existing .dev.vars is not configured for local-session. It has been preserved.');
      console.error('Run "npm run auth:reset" to generate a fresh local-session configuration, or edit .dev.vars manually.');
      process.exit(1);
    }
  } else if (existsSync(credentialsFile)) {
    const saved = readFileSync(credentialsFile, 'utf8');
    const emailMatch = saved.match(/^Email:\s*(.+)$/m);
    const passMatch = saved.match(/^Password:\s*(.+)$/m);
    if (emailMatch && passMatch) {
      accountInfo = { email: emailMatch[1].trim(), password: passMatch[1].trim(), created: false };
    }
  }
}

// Explicit local runner: build using the portable profile regardless of a copied
// hosting checkout profile, then apply migrations to the same persistent store.
process.env.KHESHT_LOCAL_WORKSPACE = '1';
if (!existsSync('dist/server/wrangler.json')) {
  runNodeScript('run-framework.mjs', ['build']);
  runNodeScript('clean-build-secrets.mjs');
}
runNodeScript('migrate-local.mjs');

console.log('\n============================================================');
if (accountInfo) {
  console.log(accountInfo.created ? 'Local admin account created:' : 'Local admin account credentials:');
  console.log(`URL:      http://127.0.0.1:5173/auth`);
  console.log(`Email:    ${accountInfo.email}`);
  console.log(`Password: ${accountInfo.password}`);
  console.log('(Saved locally in .wrangler/local-credentials.txt — run "npm run auth:reset" to reset)');
} else {
  const envText = readFileSync('.dev.vars', 'utf8');
  const ownerEmail = envText.match(/^KHESHT_LOCAL_OWNER_EMAIL\s*=\s*["']?([^"'\r\n]+)["']?/m)?.[1] ?? 'owner@khesht.test';
  console.log(`URL:      http://127.0.0.1:5173/auth`);
  console.log(`Email:    ${ownerEmail}`);
  console.log('(If you forgot the password, run: npm run auth:reset)');
}
console.log('============================================================\n');

if (mode === 'setup') {
  console.log('Setup complete. Run npm run local (built server) or npm run dev (live editing).');
} else {
  runNodeScript(mode === 'dev' ? 'run-framework.mjs' : 'start-local.mjs', mode === 'dev' ? ['dev'] : []);
}
