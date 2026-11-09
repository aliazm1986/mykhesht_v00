import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

console.log('\n============================================================');
console.log('  استقرار مستقیم پروژه خشت روی رانفلر (Runflare CLI)');
console.log('============================================================\n');

const check = spawnSync('runflare', ['--version'], { stdio: 'pipe', shell: process.platform === 'win32' });
if (check.status !== 0) {
  console.log('در حال نصب ابزار رسمی خط فرمان رانفلر (runflare CLI)...');
  spawnSync('npm', ['install', '-g', 'runflare', '--registry=https://mirror-npm.runflare.com'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

console.log('\nگام ۱: در صورت نیاز وارد حساب رانفلر خود شوید (اگر قبلاً لاگین کرده‌اید رد می‌شود)...');
console.log('در حال اجرای دستور استقرار (runflare deploy)...');
const res = spawnSync('runflare', ['deploy'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (res.status !== 0) {
  console.log('\nاگر هنوز وارد حساب رانفلر نشده‌اید، ابتدا در ترمینال بزنید:');
  console.log('  runflare login');
  console.log('و سپس دوباره بزنید:');
  console.log('  runflare deploy');
}
