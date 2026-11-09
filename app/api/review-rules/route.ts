import {eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '@/db';
import {reviewRules} from '@/db/schema';
import {auditQuery,getCurrentActor} from '@/lib/control';
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'cache-control':'no-store'}});
export async function GET(){const a=await getCurrentActor();if(!a)return json({error:'ورود لازم است.'},401);const rule=(await getDb().select().from(reviewRules).where(eq(reviewRules.ownerId,a.userId)).limit(1))[0];return json({rule:rule?{...rule,enabled:!!rule.enabled,tracks:JSON.parse(rule.tracksJson)}:{enabled:false,trigger:'all',tracks:['داده']}});}
export async function PUT(request:Request){const a=await getCurrentActor();if(!a)return json({error:'ورود لازم است.'},401);const p=z.object({enabled:z.boolean(),trigger:z.enum(['all','data_room','sample_report','independent_review','financial_report']),tracks:z.array(z.enum(['حقوقی','داده','کارشناسی','مالی'])).min(1).max(4)}).safeParse(await request.json().catch(()=>null));if(!p.success)return json({error:'قواعد معتبر نیستند.'},400);const row={ownerId:a.userId,enabled:p.data.enabled?1:0,trigger:p.data.trigger,tracksJson:JSON.stringify([...new Set(p.data.tracks)]),updatedAt:Date.now()};await getDb().batch([getDb().insert(reviewRules).values(row).onConflictDoUpdate({target:reviewRules.ownerId,set:row}),auditQuery({actorId:a.userId,action:'review_rule.saved',targetType:'review_rule',targetId:a.userId})]);return json({saved:true});}
