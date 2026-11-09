import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

const REPO_URL = 'https://github.com/aliazm1986/mykhesht_v00.git';

function run(cmd, args, ignoreError = false) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (!ignoreError && res.status !== 0) {
    return false;
  }
  return true;
}

console.log('\n============================================================');
console.log('  ارسال خودکار پروژه خشت به گیت‌هاب (GitHub Push)');
console.log(`  مخزن مقصد: ${REPO_URL}`);
console.log('============================================================\n');

// Check if git is installed
const gitCheck = spawnSync('git', ['--version'], { stdio: 'pipe', shell: process.platform === 'win32' });
if (gitCheck.status !== 0) {
  console.error('❌ خطا: برنامه Git روی ویندوز شما نصب نیست یا در PATH قرار ندارد.');
  console.error('لطفاً ابتدا Git را از https://git-scm.com/download/win دانلود و نصب کنید و سپس VS Code را ببندید و دوباره باز کنید.');
  process.exit(1);
}

// Mark directory as safe on Windows
run('git', ['config', '--global', '--add', 'safe.directory', root.replace(/\\/g, '/')], true);

// Always initialize cleanly if .git is missing or came from another OS
if (!existsSync(path.join(root, '.git'))) {
  run('git', ['init']);
}

run('git', ['config', 'user.name', 'aliazm1986'], true);
run('git', ['config', 'user.email', 'aliazm1986@users.noreply.github.com'], true);
run('git', ['config', 'core.autocrlf', 'false'], true);
run('git', ['config', 'http.postBuffer', '524288000'], true);

run('git', ['branch', '-M', 'main'], true);
run('git', ['remote', 'remove', 'origin'], true);
run('git', ['remote', 'add', 'origin', REPO_URL], true);

console.log('\nدر حال آماده‌سازی و ثبت فایل‌ها (git add & commit)...');
run('git', ['add', '-A'], true);
run('git', ['commit', '-m', 'feat: production-ready Khesht platform for Liara deployment'], true);

console.log('\nدر حال ارسال به گیت‌هاب (ممکن است پنجره ورود GitHub باز شود)...');
const pushOk = run('git', ['push', '-u', 'origin', 'main', '--force']);

if (pushOk) {
  console.log('\n============================================================');
  console.log('✅ تمام فایل‌ها با موفقیت در گیت‌هاب شما قرار گرفت!');
  console.log('آدرس مخزن: https://github.com/aliazm1986/mykhesht_v00');
  console.log('============================================================\n');
} else {
  console.error('\n============================================================');
  console.error('⚠️ ارسال به گیت‌هاب با خطا مواجه شد. یکی از ۳ مورد زیر را بررسی کنید:');
  console.error('۱. آیا مخزن mykhesht_v00 را در سایت گیت‌هاب ساخته‌اید؟');
  console.error('   اگر نساخته‌اید، وارد https://github.com/new شوید، نام مخزن را دقیقا mykhesht_v00 بگذارید و روی Create repository کلیک کنید.');
  console.error('۲. آیا اینترنت/فیلترشکن شما به github.com متصل است؟');
  console.error('۳. اگر پنجره ورود به GitHub باز شد، با اکانت aliazm1986 لاگین و Authorize کنید.');
  console.error('============================================================\n');
  process.exit(1);
}
