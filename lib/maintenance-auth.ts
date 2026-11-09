import { env } from 'cloudflare:workers';
import { getCurrentActor } from './control';

type Settings = { KHESHT_MAINTENANCE_MODE?: string; KHESHT_MAINTENANCE_HOST?: string; KHESHT_MAINTENANCE_SIGNING_KEY?: string; DB?: D1Database; BUCKET?: R2Bucket };
const deny = (error: string, status: number) => ({ error: Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } }) });
export async function authorizeMaintenance(request: Request) {
  const settings = env as unknown as Settings;
  const url = new URL(request.url);
  if (!settings.DB || !settings.BUCKET || url.hostname !== settings.KHESHT_MAINTENANCE_HOST) return deny('نگهداری در این میزبان فعال نیست.', 503);
  if (!['owner-private', 'signed-service'].includes(settings.KHESHT_MAINTENANCE_MODE || '')) return deny('نگهداری فعال نیست.', 503);
  const actor = await getCurrentActor();
  if (actor) return actor.role === 'admin' ? { db: settings.DB, bucket: settings.BUCKET } : deny('دسترسی مدیر لازم است.', 403);
  // Compatibility for the existing owner-only deployment. Never select this
  // mode for a shared Site. Signed mode has its own cryptographic authorization.
  if (settings.KHESHT_MAINTENANCE_MODE === 'owner-private') return { db: settings.DB, bucket: settings.BUCKET };
  if (settings.KHESHT_MAINTENANCE_MODE !== 'signed-service' || !settings.KHESHT_MAINTENANCE_SIGNING_KEY || settings.KHESHT_MAINTENANCE_SIGNING_KEY.length < 32) return deny('دسترسی سرویس نگهداری پیکربندی نشده است.', 503);
  const timestamp = request.headers.get('x-khesht-timestamp') || '';
  const nonce = request.headers.get('x-khesht-nonce') || '';
  const signature = request.headers.get('x-khesht-signature') || '';
  if (!/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 120000 || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return deny('امضای درخواست معتبر نیست.', 401);
  if (request.body && (await request.clone().arrayBuffer()).byteLength > 0) return deny('درخواست نگهداری باید بدون بدنه باشد.', 400);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(settings.KHESHT_MAINTENANCE_SIGNING_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/../g)!, x => parseInt(x, 16));
  const message = `${request.method}\n${url.host}\n${url.pathname}${url.search}\n${timestamp}\n${nonce}`;
  if (!await crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(message))) return deny('امضای درخواست معتبر نیست.', 401);
  await settings.DB.prepare('DELETE FROM maintenance_nonces WHERE expires_at < ?').bind(Date.now()).run();
  const claim = await settings.DB.prepare('INSERT INTO maintenance_nonces(nonce,expires_at) VALUES(?,?) ON CONFLICT(nonce) DO NOTHING RETURNING nonce').bind(nonce, Date.now() + 240000).first();
  if (!claim) return deny('این درخواست قبلاً دریافت شده است.', 409);
  return { db: settings.DB, bucket: settings.BUCKET };
}
