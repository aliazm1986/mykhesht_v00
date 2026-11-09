import { createBackup, verifyBackup } from '@/lib/backup-operations';
import { authorizeMaintenance } from '@/lib/maintenance-auth';
export const dynamic = 'force-dynamic';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
type Run = { id: string; state: string; backup_id: string | null; result_json: string | null; started_at: number; finished_at: number | null };

// Shared service endpoint: Sites Dispatch authenticates service callers at the
// OWNER-PRIVATE platform boundary. It supplies no visitor identity. Disable this
// mode before changing the audience; never expose this endpoint on a public Site.
async function authorize(request: Request) {
  return authorizeMaintenance(request);
}
export async function GET(request: Request) {
  const allowed = await authorize(request); if ('error' in allowed) return allowed.error;
  const runs = await allowed.db.prepare('SELECT * FROM maintenance_runs ORDER BY started_at DESC LIMIT 30').all<Run>();
  return json({ runs: runs.results.map(({ result_json, ...run }) => ({ ...run, result: result_json ? JSON.parse(result_json) : null })) });
}
export async function POST(request: Request) {
  const allowed = await authorize(request); if ('error' in allowed) return allowed.error;
  const { db, bucket } = allowed;
  const id = new Date().toISOString().slice(0, 10), now = Date.now();
  const claim = await db.prepare("INSERT INTO maintenance_runs (id,state,started_at) VALUES (?,'running',?) ON CONFLICT(id) DO UPDATE SET state='running', started_at=excluded.started_at, finished_at=NULL WHERE state='failed' OR (state='running' AND started_at < ?) RETURNING *").bind(id, now, now - 15 * 60_000).first<Run>();
  if (!claim) {
    const prior = await db.prepare('SELECT * FROM maintenance_runs WHERE id=?').bind(id).first<Run>();
    if (prior?.state === 'complete') return json({ id, reused: true, result: JSON.parse(prior.result_json || '{}') });
    return json({ error: 'عملیات نگهداری در حال اجراست؛ بعداً بررسی کنید.' }, 409);
  }
  try {
    let backupId = claim.backup_id;
    if (!backupId) {
      const response = await createBackup(bucket, '__scheduled_maintenance__');
      const backup = await response.json() as { id?: string; error?: string };
      if (!response.ok || !backup.id) throw new Error('backup_creation_failed');
      backupId = backup.id;
      await db.prepare('UPDATE maintenance_runs SET backup_id=? WHERE id=? AND started_at=?').bind(backupId, id, now).run();
    }
    const response = await verifyBackup(bucket, '__scheduled_maintenance__', backupId);
    if (!response.ok) {
      // A damaged prior snapshot must not trap every retry on the same backup.
      await db.prepare('UPDATE maintenance_runs SET backup_id=NULL WHERE id=? AND started_at=?').bind(id,now).run();
      const fresh=await createBackup(bucket,'__scheduled_maintenance__');
      const value=await fresh.json() as {id?:string};
      if(!fresh.ok||!value.id)throw new Error('backup_recreation_failed');
      backupId=value.id;
      await db.prepare('UPDATE maintenance_runs SET backup_id=? WHERE id=? AND started_at=?').bind(backupId,id,now).run();
      if(!(await verifyBackup(bucket,'__scheduled_maintenance__',backupId)).ok)throw new Error('backup_verification_failed');
    }
    await db.prepare('SELECT 1 AS ok').first(); await bucket.list({ limit: 1 });
    const result = { backupId, verified: true, database: 'ok', storage: 'ok', checkedAt: Date.now() };
    await db.prepare("UPDATE maintenance_runs SET state='complete', result_json=?, finished_at=? WHERE id=? AND started_at=?").bind(JSON.stringify(result), Date.now(), id, now).run();
    return json({ id, reused: false, result }, 201);
  } catch {
    await db.prepare("UPDATE maintenance_runs SET state='failed', result_json=?, finished_at=? WHERE id=? AND started_at=?").bind(JSON.stringify({ error: 'backup_or_health_check_failed', checkedAt: Date.now() }), Date.now(), id, now).run();
    return json({ id, error: 'نگهداری کامل نشد؛ سابقه برای پیگیری مدیر ثبت شد.' }, 503);
  }
}
