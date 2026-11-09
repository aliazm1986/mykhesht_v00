import {getCurrentActor,getProjectActor,getProjectCaseWithStages,pilotStages,canViewAccessLevel} from '@/lib/control';
import {getCaseEvidence,workflowRequirements,artifactOf} from '@/lib/case-workflow';
import {financialReportHtml} from '@/lib/report-export';
export async function GET(request:Request){
 const actor=await getCurrentActor();if(!actor)return Response.json({error:'ورود لازم است.'},{status:401});const slug=new URL(request.url).searchParams.get('project'),a=slug?await getProjectActor(actor,slug):null;if(!slug||!a)return Response.json({error:'پرونده در دسترس نیست.'},{status:404});
 const c=await getProjectCaseWithStages(slug,a);if(!c)return Response.json({error:'پرونده موجود نیست.'},{status:404});const e=await getCaseEvidence(c.projectCase.id,slug),r=await workflowRequirements(e,a),f=artifactOf(e,'financial_report');if(!f)return Response.json({error:'گزارش مالی نمونه تولید نشده است.'},{status:404});
 const content=JSON.parse(f.contentJson),report=e.reports.find(s=>s.id===content.sourceReportId),ids=report?JSON.parse(report.sourceDocumentIdsJson) as string[]:[];
 if(!report||ids.some(id=>!e.docs.some(row=>row.document.id===id&&canViewAccessLevel(a.role,row.document.accessLevel))))return Response.json({error:'منابع گزارش برای این نقش در دسترس نیستند.'},{status:403});
 const current=c.stages.every(s=>s.state==='passed')&&Object.entries(r.issues).filter(([key])=>key!=='independent_review').every(([,v])=>!v.length);
 if(!current&&!['admin','project_manager','expert','independent_reviewer'].includes(a.role))return Response.json({error:'گزارش برای اعضا هنوز تأیید و منتشر نشده است.'},{status:403});
 const data={slug,name:e.bundle!.definition.name,current,revision:f.revision,content,stages:c.stages.map(s=>({label:pilotStages.find(p=>p.key===s.stageKey)!.label,state:({passed:'عبور ثبت‌شده',active:'فعال',pending:'در انتظار',blocked:'متوقف'} as Record<string,string>)[s.state]??s.state,reason:s.decisionReason})),sources:e.docs.filter(d=>ids.includes(d.document.id)).map(d=>({id:d.document.id,title:d.document.title,checksum:d.document.checksumSha256,revision:d.document.revision}))};
 if(new URL(request.url).searchParams.get('format')==='json')return Response.json(data,{headers:{'cache-control':'no-store','content-disposition':`attachment; filename="khesht-financial-${slug}.json"`}});
 return new Response(financialReportHtml(data),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; frame-ancestors 'self'"}});
}
