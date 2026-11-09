import { eq, lt } from 'drizzle-orm';
import { getDb } from '@/db';
import { localAccounts, localSessions, userProfiles, memberDetails, userWallets } from '@/db/schema';
import {
  authSettings,
  checkPassword,
  localAuthEnabled,
  localUser,
  newSessionToken,
  passwordHash,
  readCookie,
  sessionCookie,
  sessionHash,
} from '@/lib/local-auth';

const json = (v: unknown, s = 200, h: Record<string, string> = {}) =>
  Response.json(v, { status: s, headers: { 'cache-control': 'no-store', ...h } });

export async function GET(request: Request) {
  return json({
    mode: localAuthEnabled() ? 'local-session' : 'sites',
    user: localAuthEnabled() ? await localUser(request.headers.get('cookie')) : null,
  });
}

export async function POST(request: Request) {
  if (!localAuthEnabled()) return json({ error: 'از ورود ChatGPT استفاده کنید.' }, 404);
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    email?: unknown;
    password?: unknown;
    displayName?: unknown;
    targetRole?: unknown;
  } | null;

  const db = getDb();
  const cfg = authSettings();

  // Quick Multi-User Switcher in Local Development Mode
  if (body?.action === 'demo_switch' && typeof body.email === 'string') {
    const targetEmail = body.email.trim().toLowerCase();
    const isOwner = targetEmail === (cfg.KHESHT_LOCAL_OWNER_EMAIL?.toLowerCase() || 'owner@khesht.test');
    let userId = isOwner ? (cfg.KHESHT_BOOTSTRAP_ADMIN_USER_ID || 'local-owner') : '';
    const now = Date.now();

    if (isOwner) {
      await db
        .insert(userProfiles)
        .values({
          userId,
          email: cfg.KHESHT_LOCAL_OWNER_EMAIL || 'owner@khesht.test',
          displayName: 'مدیر کل سامانه (Admin)',
          role: 'admin',
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userProfiles.userId,
          set: { role: 'admin', updatedAt: now },
        });
    } else {
      const existingAcc = (await db.select().from(localAccounts).where(eq(localAccounts.email, targetEmail)).limit(1))[0];
      if (existingAcc) {
        userId = existingAcc.userId;
      } else {
        userId = `demo-${crypto.randomUUID().slice(0, 8)}`;
        const name = typeof body.displayName === 'string' && body.displayName ? body.displayName : targetEmail.split('@')[0];
        const pwHash = await passwordHash('Khesht1405!');
        await db.batch([
          db.insert(localAccounts).values({ userId, email: targetEmail, passwordHash: pwHash, active: 1, createdAt: now }),
          db.insert(userProfiles).values({ userId, email: targetEmail, displayName: name, role: 'investor', createdAt: now, updatedAt: now }),
          db.insert(memberDetails).values({ userId, firstName: name, lastName: '', mobile: '09121112233', updatedAt: now }),
          db.insert(userWallets).values({ userId, balanceToman: 500_000_000, updatedAt: now }),
        ]);
      }
    }

    const token = newSessionToken();
    await db.insert(localSessions).values({
      tokenHash: await sessionHash(token),
      userId,
      expiresAt: now + 8 * 3600000,
    });
    return json({ ok: true, userId, email: targetEmail }, 200, {
      'set-cookie': `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
    });
  }

  if (
    typeof body?.email !== 'string' ||
    typeof body?.password !== 'string' ||
    body.email.length > 254 ||
    body.password.length > 128
  ) {
    return json({ error: 'اطلاعات ورود معتبر نیست.' }, 400);
  }
  const email = body.email.trim().toLowerCase(),
    key = 'login:' + (await sessionHash(email)),
    windowStart = Math.floor(Date.now() / 900000);
  const { env } = await import('cloudflare:workers');
  if (!env.DB) return json({ error: 'پایگاه داده در دسترس نیست.' }, 503);
  const counter = await env.DB.prepare(
    'INSERT INTO request_limits(key,window_start,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window_start=excluded.window_start THEN count+1 ELSE 1 END,window_start=excluded.window_start RETURNING count',
  )
    .bind(key, windowStart)
    .first<{ count: number }>();
  if (counter && counter.count > 10) {
    return json({ error: 'تلاش‌های ورود زیاد است؛ پانزده دقیقه بعد دوباره تلاش کنید.' }, 429, { 'retry-after': '900' });
  }

  if (body.action === 'register') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.password.length < 8) {
      return json({ error: 'ایمیل معتبر و گذرواژهٔ حداقل ۸ نویسه‌ای وارد کنید.' }, 400);
    }
    const owner = email === cfg.KHESHT_LOCAL_OWNER_EMAIL?.toLowerCase();
    const existing = (await db.select().from(localAccounts).where(eq(localAccounts.email, email)).limit(1))[0];
    if (owner || existing) {
      return json({ error: 'این ایمیل قبلاً ثبت شده است؛ از بخش ورود استفاده کنید.' }, 409);
    }
    const now = Date.now();
    const userId = crypto.randomUUID();
    const displayName =
      typeof body.displayName === 'string' && body.displayName.trim().length >= 2
        ? body.displayName.trim().slice(0, 80)
        : email.split('@')[0];
    const hash = await passwordHash(body.password);
    await db.batch([
      db.insert(localAccounts).values({ userId, email, passwordHash: hash, active: 1, createdAt: now }),
      db.insert(userProfiles).values({ userId, email, displayName, role: 'investor', createdAt: now, updatedAt: now }),
      db.insert(memberDetails).values({ userId, firstName: displayName, lastName: '', mobile: '', updatedAt: now }),
      db.insert(userWallets).values({ userId, balanceToman: 500_000_000, updatedAt: now }),
    ]);
    const token = newSessionToken();
    await db.insert(localSessions).values({
      tokenHash: await sessionHash(token),
      userId,
      expiresAt: Date.now() + 8 * 3600000,
    });
    return json({ ok: true, userId, email, displayName }, 201, {
      'set-cookie': `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
    });
  }

  const owner = email === cfg.KHESHT_LOCAL_OWNER_EMAIL?.toLowerCase();
  const account = (await db.select().from(localAccounts).where(eq(localAccounts.email, email)).limit(1))[0];
  const stored = owner
    ? account?.active
      ? account.passwordHash
      : cfg.KHESHT_LOCAL_PASSWORD_HASH
    : account?.active
      ? account.passwordHash
      : null;
  if (!stored || !(await checkPassword(body.password, stored))) {
    return json({ error: 'ایمیل یا گذرواژه معتبر نیست.' }, 401);
  }
  const userId = owner ? cfg.KHESHT_BOOTSTRAP_ADMIN_USER_ID : account!.userId;
  if (!userId) return json({ error: 'حساب مدیر پیکربندی نشده است.' }, 503);
  const token = newSessionToken();
  await db.delete(localSessions).where(lt(localSessions.expiresAt, Date.now()));
  await db.insert(localSessions).values({
    tokenHash: await sessionHash(token),
    userId,
    expiresAt: Date.now() + 8 * 3600000,
  });
  return json({ ok: true }, 200, {
    'set-cookie': `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  });
}

export async function DELETE(request: Request) {
  if (!localAuthEnabled()) return json({ error: 'ورود مستقل فعال نیست.' }, 404);
  const token = readCookie(request.headers.get('cookie'));
  if (token) await getDb().delete(localSessions).where(eq(localSessions.tokenHash, await sessionHash(token)));
  return json({ ok: true }, 200, {
    'set-cookie': `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`,
  });
}
