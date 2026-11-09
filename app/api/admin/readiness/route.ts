import { env } from 'cloudflare:workers';
import { desc } from 'drizzle-orm';
import { getDb } from '@/db';
import { operationalEvidence } from '@/db/schema';
import { getCurrentActor, auditQuery } from '@/lib/control';
import { operationalChecks } from '@/lib/operational-checks';
const json = (v: unknown, status = 200) => Response.json(v, { status, headers: { 'cache-control': 'no-store' } });
async function admin() { const actor = await getCurrentActor(); return actor?.role === 'admin' ? actor : null; }
export async function GET() {
  if (!await admin()) return json({ error: 'دسترسی مدیر لازم است.' }, 403);
  const history = await getDb().select().from(operationalEvidence).orderBy(desc(operationalEvidence.createdAt)).limit(500);
  const settings = env as unknown as { KHESHT_MAINTENANCE_MODE?: string; KHESHT_MAINTENANCE_SIGNING_KEY?: string };
  return json({ checks: operationalChecks.map(c => ({ ...c, latest: history.find(e => e.checkKey === c.key) ?? null })), history, maintenance: { mode: settings.KHESHT_MAINTENANCE_MODE || 'disabled', sharedServiceReady: settings.KHESHT_MAINTENANCE_MODE === 'signed-service' && (settings.KHESHT_MAINTENANCE_SIGNING_KEY?.length ?? 0) >= 32 }, notice: 'این دفتر، اظهارنظر ثبت‌شدهٔ مدیر است؛ تأیید مستقل یا مجوز فعالیت محسوب نمی‌شود.' });
}
export async function POST(request: Request) {
  const actor = await admin(); if (!actor) return json({ error: 'دسترسی مدیر لازم است.' }, 403);
  const b = await request.json().catch(() => null) as {checkKey?: string; status?: string; note?: string; evidenceRef?: string} | null;
  if (!b || typeof b.checkKey !== 'string' || typeof b.status !== 'string' || !operationalChecks.some(c => c.key === b.checkKey) || !['pending', 'recorded'].includes(b?.status) || typeof b?.note !== 'string' || b.note.trim().length < 20 || b.note.length > 3000 || typeof b?.evidenceRef !== 'string' || b.evidenceRef.trim().length < 3 || b.evidenceRef.length > 500) return json({ error: 'موضوع، وضعیت، مرجع شاهد و توضیح حداقل ۲۰ نویسه‌ای لازم است.' }, 400);
  const id = crypto.randomUUID();
  await getDb().batch([getDb().insert(operationalEvidence).values({ id, checkKey: b.checkKey, status: b.status, evidenceRef: b.evidenceRef.trim(), note: b.note.trim(), actorId: actor.userId, createdAt: Date.now() }), auditQuery({ actorId: actor.userId, action: 'readiness.recorded', targetType: 'operational_evidence', targetId: id })]);
  return json({ ok: true, id }, 201);
}
