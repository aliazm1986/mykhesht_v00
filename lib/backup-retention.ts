import {desc,eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {backupSnapshots} from '@/db/schema';
// The policy is a proposal until the owner explicitly selects a candidate in the UI.
export async function retentionPlan(){const rows=await getDb().select().from(backupSnapshots).orderBy(desc(backupSnapshots.createdAt));const protectedIds=new Set(rows.slice(0,3).map(r=>r.id));return {days:30,minimumCopies:3,automaticDeletion:false,candidates:rows.filter(r=>!protectedIds.has(r.id)&&r.createdAt<Date.now()-30*86400000).map(({id,createdAt,sizeBytes})=>({id,createdAt,sizeBytes}))};}
export async function removeExpiredBackup(bucket:R2Bucket,id:string){const plan=await retentionPlan();if(!plan.candidates.some(r=>r.id===id))return false;let cursor:string|undefined;do{const page=await bucket.list({prefix:`private-backups/${id}/`,limit:500,cursor});if(page.objects.length)await bucket.delete(page.objects.map(o=>o.key));cursor=page.truncated?page.cursor:undefined;}while(cursor);await getDb().delete(backupSnapshots).where(eq(backupSnapshots.id,id));return true;}
