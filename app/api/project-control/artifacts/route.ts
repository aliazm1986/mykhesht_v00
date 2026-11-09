import { env } from 'cloudflare:workers';
import { and,eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { financialRuns } from '@/db/schema';
import { canManageDataRoom,getCurrentActor,getProjectActor,getProjectCaseWithStages,logAuditEvent,pilotStages } from '@/lib/control';
import { artifactOf,currentReport,getCaseEvidence,workflowRequirements } from '@/lib/case-workflow';
export const dynamic='force-dynamic';
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'cache-control':'no-store'}});
const inputSchema=z.object({assetValue:z.number().int().positive().max(1e13),liabilities:z.number().int().nonnegative().max(1e13),reserves:z.number().int().nonnegative().max(1e13),unitCount:z.number().int().min(1).max(1e9),basisNote:z.string().trim().min(10).max(2000)});
export async function GET(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:'ورود لازم است.'},401);
 const slug=new URL(request.url).searchParams.get('project'),a=slug?await getProjectActor(actor,slug):null;
 if(!slug||!a)return json({error:'پرونده در دسترس نیست.'},404);
 if(!canManageDataRoom(a.role)&&a.role!=='independent_reviewer')return json({error:'دسترسی شواهد ندارید.'},403);
 const c=await getProjectCaseWithStages(slug,a);if(!c)return json({error:'پرونده معتبر نیست.'},404);
 const s=await workflowRequirements(await getCaseEvidence(c.projectCase.id,slug),a);
 const download=new URL(request.url).searchParams.get('download');
 if(download){const artifact=s.artifacts.find(a=>a.kind===download);if(!artifact)return json({error:'خروجی موجود نیست.'},404);return new Response(JSON.stringify({projectSlug:slug,artifact,current:s.issues[download]?.length===0&&(download!=='financial_report'||c.stages.every(stage=>stage.state==='passed')),disclaimer:'آزمایشی و غیررسمی؛ بدون تراکنش یا قیمت مصوب'},null,2),{headers:{'content-type':'application/json; charset=utf-8','content-disposition':`attachment; filename="khesht-${download}-${slug}.json"`,'cache-control':'no-store'}});}
 return json({revision:c.projectCase.revision,canEdit:canManageDataRoom(a.role),artifacts:s.artifacts,reportId:s.report?.id??null,issues:s.issues,stages:c.stages});
}
export async function POST(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:'ورود لازم است.'},401);
 const parsed=z.object({projectSlug:z.string(),kind:z.enum(['investment_plan','value_bridge','financial_report']),revision:z.number().int().min(0),artifactRevision:z.number().int().min(0),runId:z.string().optional(),input:z.unknown().optional()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return json({error:'ورودی و نسخهٔ شواهد معتبر نیست.'},400);const b=parsed.data;
 const a=await getProjectActor(actor,b.projectSlug);if(!a)return json({error:'پرونده در دسترس نیست.'},404);
 if(!canManageDataRoom(a.role))return json({error:'اجازهٔ تنظیم شواهد ندارید.'},403);
 const c=await getProjectCaseWithStages(b.projectSlug,a);if(!c)return json({error:'پرونده معتبر نیست.'},404);
 const e=await getCaseEvidence(c.projectCase.id,b.projectSlug),old=artifactOf(e,b.kind);
 if(c.projectCase.revision!==b.revision||(old?.revision??0)!==b.artifactRevision)return json({error:'پرونده تغییر کرده است؛ اطلاعات را تازه کنید.'},409);
 let content:unknown;
 if(b.kind==='investment_plan'){
  const run=b.runId?(await getDb().select().from(financialRuns).where(and(eq(financialRuns.id,b.runId),eq(financialRuns.projectSlug,b.projectSlug),eq(financialRuns.ownerId,actor.userId))).limit(1))[0]:null;
  if(!run)return json({error:'یک تحلیل مالی ذخیره‌شدهٔ متعلق به خودتان را انتخاب کنید.'},422);
  content={financialRunId:run.id,name:run.name,input:JSON.parse(run.inputJson),results:JSON.parse(run.resultJson),savedAt:run.createdAt,educational:true};
 }else{
  const report=await currentReport(e),plan=artifactOf(e,'investment_plan');if(!report||!plan)return json({error:'گزارش و برنامهٔ جاری لازم است.'},422);
  if(b.kind==='value_bridge'){
   const p=inputSchema.safeParse(b.input);if(!p.success)return json({error:'ارقام، تعداد واحد و مبنای پل ارزش را کامل کنید.'},400);
   const v=p.data,netValue=v.assetValue-v.liabilities-v.reserves;if(netValue<=0)return json({error:'ارزش خالص فرضی باید مثبت باشد.'},400);
   content={...v,netValue,illustrativeUnitValue:netValue/v.unitCount,sourceReportId:report.id,planRevision:plan.revision,educational:true,approvedOfferPrice:null};
  }else{
   const bridge=artifactOf(e,'value_bridge');if(!bridge||c.stages.filter(s=>s.stageKey!=='financial_report').some(s=>s.state!=='passed'))return json({error:'ابتدا مراحل قبلی و تأیید مستقل را کامل کنید.'},422);
   content={sourceReportId:report.id,planRevision:plan.revision,bridgeRevision:bridge.revision,plan:JSON.parse(plan.contentJson),valueBridge:JSON.parse(bridge.contentJson),periodEnd:new Date().toISOString().slice(0,10),transactions:[],note:'گزارش مالی نمونه؛ هیچ وجه، سفارش، تخصیص یا توکن واقعی ثبت نشده است.'};
  }
 }
 const id=old?.id??crypto.randomUUID(),now=Date.now(),revision=(old?.revision??0)+1,db=env.DB;if(!db)return json({error:'پایگاه داده در دسترس نیست.'},503);
 const keys=pilotStages.slice(pilotStages.findIndex(s=>s.key===b.kind)).map(s=>s.key);
 const result=await db.batch([
  db.prepare('INSERT INTO case_artifacts (id,case_id,project_slug,kind,content_json,revision,created_by,updated_by,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM project_cases WHERE id=? AND revision=?) ON CONFLICT(case_id,kind) DO UPDATE SET content_json=excluded.content_json,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at').bind(id,c.projectCase.id,b.projectSlug,b.kind,JSON.stringify(content),revision,old?.createdBy??actor.userId,actor.userId,old?.createdAt??now,now,c.projectCase.id,b.revision),
  db.prepare(`UPDATE case_stage_decisions SET state=CASE WHEN stage_key=? AND state='active' THEN 'active' ELSE 'pending' END,decision_reason=?,updated_by=?,updated_at=? WHERE case_id=? AND stage_key IN (${keys.map(()=>'?').join(',')}) AND EXISTS(SELECT 1 FROM project_cases WHERE id=? AND revision=?)`).bind(b.kind,'شواهد تغییر کرده است؛ مراحل وابسته دوباره بررسی شوند.',actor.userId,now,c.projectCase.id,...keys,c.projectCase.id,b.revision),
  db.prepare('UPDATE project_cases SET revision=revision+1,status=\'active\',updated_at=? WHERE id=? AND revision=? RETURNING revision').bind(now,c.projectCase.id,b.revision),
 ]);
 if(!result[2].results.length)return json({error:'تغییر هم‌زمان رخ داد؛ اطلاعات را تازه کنید.'},409);
 return json({artifact:{id,kind:b.kind,revision,content},revision:b.revision+1},old?200:201);
}
