import { env } from 'cloudflare:workers';
import { getCurrentActor } from '@/lib/control';
import { localAuthEnabled, checkPassword, passwordHash, sessionHash, sessionCookie, authSettings } from '@/lib/local-auth';

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(data, { status, headers: { 'cache-control': 'no-store', ...headers } });

export async function POST(request: Request) {
  if (!localAuthEnabled()) return json({ error: 'گذرواژهٔ حساب ChatGPT از تنظیمات همان حساب مدیریت می‌شود.' }, 404);
  const actor = await getCurrentActor();
  if (!actor) return json({ error: 'ورود لازم است.' }, 401);
  const b = (await request.json().catch(() => null)) as { currentPassword?: string; newPassword?: string; token?: string } | null;
  if (
    typeof b?.currentPassword !== 'string' ||
    b.currentPassword.length > 128 ||
    typeof b?.newPassword !== 'string' ||
    b.newPassword.length < 16 ||
    b.newPassword.length > 128 ||
    b.currentPassword === b.newPassword
  ) {
    return json({ error: 'گذرواژهٔ فعلی و گذرواژهٔ تازهٔ متفاوت با ۱۶ تا ۱۲۸ نویسه لازم است.' }, 400);
  }
  const db = env.DB;
  if (!db) return json({ error: 'پایگاه داده در دسترس نیست.' }, 503);
  const key = `password:${actor.userId}`,
    windowStart = Math.floor(Date.now() / 900000);
  const limit = await db
    .prepare(
      'INSERT INTO request_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END,window_start=excluded.window_start RETURNING count',
    )
    .bind(key, windowStart)
    .first<{ count: number }>();
  if (limit && limit.count > 5) return json({ error: 'تلاش‌های تغییر گذرواژه زیاد است؛ پانزده دقیقه بعد تلاش کنید.' }, 429);

  const cfg = authSettings();
  const isOwner = actor.userId === cfg.KHESHT_BOOTSTRAP_ADMIN_USER_ID;
  const account = await db
    .prepare('SELECT password_hash FROM local_accounts WHERE user_id=? AND active=1')
    .bind(actor.userId)
    .first<{ password_hash: string }>();

  const expectedHash = account?.password_hash ?? (isOwner ? cfg.KHESHT_LOCAL_PASSWORD_HASH : undefined);
  if (!expectedHash || !(await checkPassword(b.currentPassword, expectedHash))) {
    return json({ error: 'گذرواژهٔ فعلی معتبر نیست.' }, 401);
  }

  const next = await passwordHash(b.newPassword);
  const now = Date.now();
  if (isOwner && !account) {
    await db.batch([
      db
        .prepare('INSERT INTO local_accounts(user_id,email,password_hash,active,created_at) VALUES(?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET password_hash=excluded.password_hash,active=1')
        .bind(actor.userId, (cfg.KHESHT_LOCAL_OWNER_EMAIL || actor.email).toLowerCase(), next, now),
      db.prepare('DELETE FROM local_sessions WHERE user_id=?').bind(actor.userId),
      db
        .prepare("INSERT INTO audit_events(id,actor_id,action,target_type,target_id,payload_json,created_at) VALUES(?,?,'local_account.password_changed','user',?,'{}',?)")
        .bind(crypto.randomUUID(), actor.userId, actor.userId, now),
    ]);
    return json({ ok: true }, 200, {
      'set-cookie': `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
    });
  }

  const results = await db.batch([
    db.prepare('UPDATE local_accounts SET password_hash=? WHERE user_id=? AND password_hash=? AND active=1').bind(next, actor.userId, account!.password_hash),
    db
      .prepare('DELETE FROM local_sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM local_accounts WHERE user_id=? AND password_hash=?)')
      .bind(actor.userId, actor.userId, next),
    db
      .prepare(
        "INSERT INTO audit_events(id,actor_id,action,target_type,target_id,payload_json,created_at) SELECT ?,?,'local_account.password_changed','user',?,'{}',? WHERE EXISTS(SELECT 1 FROM local_accounts WHERE user_id=? AND password_hash=?)",
      )
      .bind(crypto.randomUUID(), actor.userId, actor.userId, now, actor.userId, next),
    db
      .prepare('DELETE FROM local_recovery_tokens WHERE user_id=? AND EXISTS(SELECT 1 FROM local_accounts WHERE user_id=? AND password_hash=?)')
      .bind(actor.userId, actor.userId, next),
  ]);
  if (results[0].meta.changes !== 1) return json({ error: 'حساب هم‌زمان تغییر کرده است؛ دوباره وارد شوید.' }, 409);
  return json({ ok: true }, 200, {
    'set-cookie': `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  });
}

export async function PUT(request: Request) {
  if (!localAuthEnabled()) return json({ error: 'ورود مستقل فعال نیست.' }, 404);
  const b = (await request.json().catch(() => null)) as { currentPassword?: string; newPassword?: string; token?: string } | null;
  if (
    typeof b?.token !== 'string' ||
    !/^[a-f0-9]{64}$/.test(b.token) ||
    typeof b?.newPassword !== 'string' ||
    b.newPassword.length < 16 ||
    b.newPassword.length > 128
  ) {
    return json({ error: 'کد بازیابی و گذرواژهٔ ۱۶ تا ۱۲۸ نویسه‌ای لازم است.' }, 400);
  }
  const token = await sessionHash(b.token),
    now = Date.now(),
    db = env.DB;
  if (!db) return json({ error: 'پایگاه داده در دسترس نیست.' }, 503);
  const recovery = await db
    .prepare('SELECT user_id FROM local_recovery_tokens WHERE token_hash=? AND expires_at>?')
    .bind(token, now)
    .first<{ user_id: string }>();
  if (!recovery) return json({ error: 'کد بازیابی نامعتبر، مصرف‌شده یا منقضی است.' }, 400);
  const next = await passwordHash(b.newPassword);
  const results = await db.batch([
    db
      .prepare('UPDATE local_accounts SET password_hash=? WHERE active=1 AND user_id=(SELECT user_id FROM local_recovery_tokens WHERE token_hash=? AND expires_at>?)')
      .bind(next, token, now),
    db.prepare('DELETE FROM local_sessions WHERE user_id=(SELECT user_id FROM local_recovery_tokens WHERE token_hash=? AND expires_at>?)').bind(token, now),
    db
      .prepare(
        "INSERT INTO audit_events(id,actor_id,action,target_type,target_id,payload_json,created_at) SELECT ?,user_id,'local_account.recovery_redeemed','user',user_id,'{}',? FROM local_recovery_tokens WHERE token_hash=? AND expires_at>?",
      )
      .bind(crypto.randomUUID(), now, token, now),
    db.prepare('DELETE FROM local_recovery_tokens WHERE token_hash=?').bind(token),
  ]);
  return results[0].meta.changes === 1 ? json({ ok: true }) : json({ error: 'کد بازیابی نامعتبر، مصرف‌شده یا منقضی است.' }, 400);
}
