import { env } from 'cloudflare:workers';
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '@/db';
import { localAccounts, localSessions, userProfiles } from '@/db/schema';

export const sessionCookie = 'khesht_session';
type Bindings = {
  KHESHT_AUTH_MODE?: string;
  KHESHT_LOCAL_OWNER_EMAIL?: string;
  KHESHT_LOCAL_PASSWORD_HASH?: string;
  KHESHT_BOOTSTRAP_ADMIN_USER_ID?: string;
  KHESHT_DEFAULT_DEMO_SESSION?: string;
};

const unquote = (v?: string) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : undefined);

export const authSettings = (): Bindings => {
  const raw = env as unknown as Bindings;
  return {
    KHESHT_AUTH_MODE: unquote(raw.KHESHT_AUTH_MODE),
    KHESHT_LOCAL_OWNER_EMAIL: unquote(raw.KHESHT_LOCAL_OWNER_EMAIL),
    KHESHT_LOCAL_PASSWORD_HASH: unquote(raw.KHESHT_LOCAL_PASSWORD_HASH),
    KHESHT_BOOTSTRAP_ADMIN_USER_ID: unquote(raw.KHESHT_BOOTSTRAP_ADMIN_USER_ID),
    KHESHT_DEFAULT_DEMO_SESSION: unquote(raw.KHESHT_DEFAULT_DEMO_SESSION),
  };
};

export const localAuthEnabled = () => authSettings().KHESHT_AUTH_MODE === 'local-session';
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
export const sessionHash = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

export async function passwordHash(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)).buffer)) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bytes = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100000 },
    key,
    256,
  );
  return `pbkdf2-sha256:100000:${salt}:${hex(bytes)}`;
}

export async function checkPassword(password: string, stored: string) {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2-sha256' || parts[1] !== '100000') return false;
  const computed = await passwordHash(password, parts[2]);
  // Use the HMAC verifier to compare fixed-length digests without early exits.
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('khesht-password-comparison'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(stored));
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(computed));
}

export function readCookie(value: string | null) {
  return (
    value
      ?.split(';')
      .map((s) => s.trim())
      .find((s) => s.startsWith(sessionCookie + '='))
      ?.slice(sessionCookie.length + 1) ?? ''
  );
}

export async function localUser(cookie: string | null) {
  const token = readCookie(cookie);
  const cfg = authSettings();
  const loggedOut = Boolean(cookie && cookie.includes('khesht_logged_out=1'));
  if (!/^[a-f0-9]{64}$/.test(token)) {
    if (!loggedOut && cfg.KHESHT_DEFAULT_DEMO_SESSION === '1' && cfg.KHESHT_BOOTSTRAP_ADMIN_USER_ID && cfg.KHESHT_LOCAL_OWNER_EMAIL) {
      return {
        userId: cfg.KHESHT_BOOTSTRAP_ADMIN_USER_ID,
        email: cfg.KHESHT_LOCAL_OWNER_EMAIL,
        displayName: 'مدیر کل سامانه (Admin)',
        fullName: 'مدیر کل سامانه (Admin)',
      };
    }
    return null;
  }
  const session = (
    await getDb()
      .select()
      .from(localSessions)
      .where(and(eq(localSessions.tokenHash, await sessionHash(token)), gt(localSessions.expiresAt, Date.now())))
      .limit(1)
  )[0];
  if (!session) return null;
  if (session.userId === cfg.KHESHT_BOOTSTRAP_ADMIN_USER_ID && cfg.KHESHT_LOCAL_OWNER_EMAIL) {
    return {
      userId: session.userId,
      email: cfg.KHESHT_LOCAL_OWNER_EMAIL,
      displayName: cfg.KHESHT_LOCAL_OWNER_EMAIL,
      fullName: null,
    };
  }
  const account = (
    await getDb()
      .select()
      .from(localAccounts)
      .where(and(eq(localAccounts.userId, session.userId), eq(localAccounts.active, 1)))
      .limit(1)
  )[0];
  if (!account) return null;
  const profile = (await getDb().select().from(userProfiles).where(eq(userProfiles.userId, account.userId)).limit(1))[0];
  return { userId: account.userId, email: account.email, displayName: profile?.displayName || account.email, fullName: profile?.displayName || null };
}

export const newSessionToken = () => hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
