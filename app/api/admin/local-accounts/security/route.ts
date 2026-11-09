import { env } from 'cloudflare:workers';
import { getCurrentActor } from '@/lib/control';
import { authSettings, localAuthEnabled, newSessionToken, sessionHash } from '@/lib/local-auth';
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'cache-control': 'no-store' } });
export async function POST(request: Request) {
  if (!localAuthEnabled()) return json({ error: 'این ابزار فقط برای حساب مستقل است.' }, 404);
  const actor = await getCurrentActor();
  if (!actor) return json({ error: 'ورود لازم است.' }, 401);
  if (actor.role !== 'admin') return json({ error: 'دسترسی مدیر لازم است.' }, 403);
  const b = await request.json().catch(() => null) as {userId?: string; action?: string} | null;
  if (typeof b?.userId !== 'string' || typeof b.action !== 'string' || !['revoke_sessions', 'recovery', 'deactivate'].includes(b.action)) return json({ error: 'کاربر و عملیات معتبر لازم است.' }, 400);
  if (b.userId === authSettings().KHESHT_BOOTSTRAP_ADMIN_USER_ID) return json({ error: 'حساب مالک از تنظیمات امن سرور مدیریت می‌شود.' }, 409);
  const db=env.DB; if(!db) return json({error:'پایگاه داده در دسترس نیست.'},503);
  const account = await db.prepare('SELECT user_id FROM local_accounts WHERE user_id=? AND active=1').bind(b.userId).first();
  if (!account) return json({ error: 'حساب مستقل فعال یافت نشد.' }, 404);
  const token = b.action === 'recovery' ? newSessionToken() : null;
  const expiresAt = Date.now() + 15 * 60000;
  // Never log the code, hash or password; recovery is short-lived and single-use.
  const queries = [db.prepare('DELETE FROM local_sessions WHERE user_id=?').bind(b.userId), db.prepare('DELETE FROM local_recovery_tokens WHERE user_id=?').bind(b.userId)];
  if (token) queries.push(db.prepare('INSERT INTO local_recovery_tokens(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sessionHash(token), b.userId, expiresAt));
  if (b.action === 'deactivate') queries.push(db.prepare('UPDATE local_accounts SET active=0 WHERE user_id=?').bind(b.userId));
  queries.push(db.prepare('INSERT INTO audit_events(id,actor_id,action,target_type,target_id,payload_json,created_at) VALUES(?,?,?,?,?,?,?)').bind(crypto.randomUUID(),actor.userId,`local_account.${b.action}`,'user',b.userId,'{}',Date.now()));
  await db.batch(queries);
  return json({ ok: true, ...(token ? { token, expiresAt } : {}) });
}
