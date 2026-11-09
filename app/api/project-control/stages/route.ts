import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { canManageStages,getCurrentActor,getProjectActor,getProjectCaseWithStages,logAuditEvent,pilotStages } from '@/lib/control';
import { getCaseEvidence,workflowRequirements } from '@/lib/case-workflow';
export const dynamic='force-dynamic';
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'cache-control':'no-store'}});
export async function GET(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:'ورود لازم است.'},401);
 const slug=new URL(request.url).searchParams.get('project'),a=slug?await getProjectActor(actor,slug):null;
 if(!slug||!a)return json({error:'پرونده در دسترس نیست.'},404);
 const c=await getProjectCaseWithStages(slug,a);if(!c)return json({error:'پرونده معتبر نیست.'},404);
 const r=await workflowRequirements(await getCaseEvidence(c.projectCase.id,slug),a);
 return json({...c,requirements:r.issues,permissions:{canManage:canManageStages(a.role)}});
}
export async function PUT(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:'ورود لازم است.'},401);
 const p=z.object({projectSlug:z.string(),stageKey:z.string(),state:z.enum(['pending','active','passed','blocked']),revision:z.number().int().min(0),responsibleRole:z.string(),decisionReason:z.string().trim().min(10).max(800),reopenDownstream:z.boolean().optional()}).safeParse(await request.json().catch(()=>null));
 if(!p.success)return json({error:'مرحله، نسخه و علت تصمیم (حداقل ۱۰ نویسه) را کامل کنید.'},400);
 const b=p.data,index=pilotStages.findIndex(s=>s.key===b.stageKey);
 if(index<0||b.responsibleRole!==pilotStages[index].responsibleRole)return json({error:'مرحله یا نقش مسئول معتبر نیست.'},400);
 const a=await getProjectActor(actor,b.projectSlug);if(!a)return json({error:'پرونده در دسترس نیست.'},404);
 if(!canManageStages(a.role)||(a.role==='independent_reviewer'&&b.stageKey!=='independent_review'))return json({error:'اجازهٔ تصمیم این مرحله را ندارید.'},403);
 const c=await getProjectCaseWithStages(b.projectSlug,a);if(!c)return json({error:'پرونده معتبر نیست.'},404);
 if(c.projectCase.revision!==b.revision)return json({error:'نسخهٔ پرونده تغییر کرده است؛ اطلاعات را تازه کنید.'},409);
 const stage=c.stages.find(s=>s.stageKey===b.stageKey)!;
 if(['active','passed'].includes(b.state)&&c.stages.some(s=>pilotStages.findIndex(p=>p.key===s.stageKey)<index&&s.state!=='passed'))return json({error:'تمام مراحل قبلی باید با شواهد لازم عبور کرده باشند.'},422);
 if(b.state==='passed'){
  if(stage.state!=='active')return json({error:'ابتدا مرحله را فعال و شواهد را مرور کنید.'},409);
  const requirements=await workflowRequirements(await getCaseEvidence(c.projectCase.id,b.projectSlug),a);
  const blocking=pilotStages.slice(0,index+1).filter(s=>s.key!=="independent_review"||b.stageKey==="independent_review").flatMap(s=>requirements.issues[s.key]);
  if(blocking.length)return json({error:blocking.join(' '),requirements:blocking},422);
 }
 const later=pilotStages.slice(index+1).map(s=>s.key),reopen=stage.state==='passed'&&b.state!=='passed';
 if(reopen&&!b.reopenDownstream)return json({error:'بازگشایی، تأیید مراحل بعد را باطل می‌کند؛ این گزینه را تأیید کنید.'},422);
 if(b.state==='active'&&c.stages.some(s=>s.stageKey!==b.stageKey&&s.state==='active'&&!(reopen&&later.includes(s.stageKey as typeof later[number]))))return json({error:'مرحلهٔ فعال دیگری وجود دارد.'},409);
 const now=Date.now(),db=env.DB;if(!db)return json({error:'پایگاه داده در دسترس نیست.'},503);
 const queries:D1PreparedStatement[]=[];
 if(reopen&&later.length)queries.push(db.prepare(`UPDATE case_stage_decisions SET state='pending',decision_reason=?,updated_by=?,updated_at=? WHERE case_id=? AND stage_key IN (${later.map(()=>'?').join(',')}) AND EXISTS(SELECT 1 FROM project_cases WHERE id=? AND revision=?)`).bind('مرحلهٔ قبلی بازگشایی شده است؛ نیازمند بررسی مجدد.',actor.userId,now,c.projectCase.id,...later,c.projectCase.id,b.revision));
 queries.push(db.prepare('UPDATE case_stage_decisions SET state=?,responsible_role=?,decision_reason=?,updated_by=?,updated_at=? WHERE id=? AND EXISTS(SELECT 1 FROM project_cases WHERE id=? AND revision=?)').bind(b.state,b.responsibleRole,b.decisionReason.trim(),actor.userId,now,stage.id,c.projectCase.id,b.revision));
 queries.push(db.prepare('UPDATE project_cases SET revision=revision+1,status=?,updated_at=? WHERE id=? AND revision=? RETURNING revision').bind(b.stageKey==='financial_report'&&b.state==='passed'?'pilot_complete':'active',now,c.projectCase.id,b.revision));
 try{const r=await db.batch(queries);if(!r.at(-1)!.results.length)return json({error:'تصمیم هم‌زمان ثبت شد؛ اطلاعات را تازه کنید.'},409);}catch{return json({error:'وضعیت هم‌زمان ناسازگار است؛ دوباره دریافت کنید.'},409);}
 return json({stage:{...stage,state:b.state,responsibleRole:b.responsibleRole,decisionReason:b.decisionReason.trim(),updatedBy:actor.userId,updatedAt:now},revision:b.revision+1});
}
