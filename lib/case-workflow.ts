import { and,desc,eq,inArray } from 'drizzle-orm';
import { getDb } from '@/db';
import { auditEvents,caseArtifacts,dataRoomDocuments,documentExtractions,pilotRecords,sampleReports } from '@/db/schema';
import { getProjectBundle } from '@/lib/projects-server';
import { canViewAccessLevel,type Actor } from '@/lib/control';
export async function getCaseEvidence(caseId:string,slug:string){
 const db=getDb();
 const[bundle,docs,reports,artifacts,notes,authors]=await Promise.all([getProjectBundle(slug),db.select({document:dataRoomDocuments,extraction:documentExtractions}).from(dataRoomDocuments).leftJoin(documentExtractions,eq(documentExtractions.documentId,dataRoomDocuments.id)).where(eq(dataRoomDocuments.caseId,caseId)).limit(201),db.select().from(sampleReports).where(eq(sampleReports.caseId,caseId)).orderBy(desc(sampleReports.generatedAt)).limit(30),db.select().from(caseArtifacts).where(eq(caseArtifacts.caseId,caseId)),db.select({id:pilotRecords.id}).from(pilotRecords).where(eq(pilotRecords.projectSlug,slug)).limit(1),db.selectDistinct({actorId:auditEvents.actorId}).from(auditEvents).where(and(eq(auditEvents.targetId,slug),eq(auditEvents.targetType,"project"),inArray(auditEvents.action,["project.saved","project.archived"])))]);
 return{bundle,docs,reports,artifacts,notes,authors};
}
export type CaseEvidence=Awaited<ReturnType<typeof getCaseEvidence>>;
export const artifactOf=(e:CaseEvidence,kind:string)=>e.artifacts.find(a=>a.kind===kind);
export async function dossierFingerprint(e:CaseEvidence,ids:string[]){
 const sources=ids.slice().sort().map(id=>{const row=e.docs.find(d=>d.document.id===id);return row?{id,checksum:row.document.checksumSha256,documentRevision:row.document.revision,review:row.document.reviewStatus,reviewer:row.document.reviewedBy,state:row.extraction?.state,kind:row.extraction?.sourceKind,text:row.extraction?.textContent}:{id,missing:true};});
 const inventory=e.docs.map(r=>({id:r.document.id,revision:r.document.revision,review:r.document.reviewStatus})).sort((a,b)=>a.id.localeCompare(b.id));
 const value=JSON.stringify({inventory,definition:e.bundle?.definition,plan:artifactOf(e,'investment_plan')?.contentJson??null,sources});
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
}
export async function currentReport(e:CaseEvidence){
 for(const r of e.reports){const c=JSON.parse(r.contentJson),ids=JSON.parse(r.sourceDocumentIdsJson) as string[];if(c.fingerprint&&c.fingerprint===await dossierFingerprint(e,ids))return r;}
 return null;
}
export async function workflowRequirements(e:CaseEvidence,actor:Actor){
 const issues:Record<string,string[]>={intake:[],data_room:[],investment_plan:[],sample_report:[],value_bridge:[],independent_review:[],closed_pilot_register:[],scenario_log:[],financial_report:[]};
 const d=e.bundle?.definition;
 if(e.docs.length>200)issues.data_room.push('سقف ۲۰۰ سند هر پرونده رد شده است؛ منابع را تفکیک و پروندهٔ جدا تعریف کنید.');
 if(!d||!d.description||!d.outcome||!d.risks.length)issues.intake.push('خلاصه، هدف، افق و حداقل یک سناریوی ریسک پروژه را ثبت کنید.');
 const included=e.docs.filter(r=>r.document.reviewStatus!=='rejected');
 if(!included.length)issues.data_room.push('حداقل یک سند خوانده‌شده و تأییدشده لازم است.');
 if(included.some(r=>{const m=r.extraction?.metadataJson?JSON.parse(r.extraction.metadataJson):{};return r.extraction?.state!=='complete'||r.document.reviewStatus!=='approved'||!r.document.reviewedBy||[r.document.uploadedBy,r.extraction?.createdBy,m.humanConfirmedBy,...(m.contributors??[])].includes(r.document.reviewedBy);} ))issues.data_room.push('اسناد استفاده‌شونده باید متن کامل و بازبینی تأییدشده داشته باشند؛ سند نامعتبر را با علت رد کنید.');
 const plan=artifactOf(e,'investment_plan');if(!plan)issues.investment_plan.push('یک تحلیل مالی ذخیره‌شده را به‌عنوان برنامهٔ پرونده انتخاب کنید.');
 const report=await currentReport(e);
 if(!report)issues.sample_report.push('گزارش آزمایشی مطابق آخرین متن، بازبینی اسناد و برنامهٔ پرونده بسازید.');
 if(report&&(JSON.parse(report.sourceDocumentIdsJson) as string[]).some(id=>!included.some(r=>r.document.id===id&&r.document.reviewStatus==='approved'&&r.extraction?.state==='complete')))issues.sample_report.push('همهٔ منابع گزارش باید بازبینی تأییدشده داشته باشند.');
 const bridge=artifactOf(e,'value_bridge'),b=bridge?JSON.parse(bridge.contentJson):null;
 if(!bridge||!report||b.sourceReportId!==report.id||b.planRevision!==plan?.revision)issues.value_bridge.push('پل ارزش آزمایشی را به گزارش و برنامهٔ جاری متصل کنید.');
 if(!['admin','independent_reviewer'].includes(actor.role))issues.independent_review.push('تصمیم این مرحله برای بازبین مستقل منصوب‌شده مجاز است.');
 const producers=new Set([...e.authors.map(a=>a.actorId),report?.generatedBy,plan?.updatedBy,bridge?.updatedBy,...included.flatMap(r=>{const m=r.extraction?.metadataJson?JSON.parse(r.extraction.metadataJson):{};return[r.document.uploadedBy,r.extraction?.createdBy,m.humanConfirmedBy,...(m.contributors??[])];})]);
 if(producers.has(actor.userId))issues.independent_review.push('تهیه‌کننده، بارگذار یا ویرایشگر شواهد نمی‌تواند تأیید مستقل همین پرونده را انجام دهد.');
 if(report&&(JSON.parse(report.sourceDocumentIdsJson) as string[]).some(id=>!e.docs.some(r=>r.document.id===id&&canViewAccessLevel(actor.role,r.document.accessLevel))))issues.independent_review.push('بازبین مستقل باید به تمام منابع گزارش دسترسی مجاز داشته باشد.');
 if(!e.notes.length)issues.scenario_log.push('حداقل یک یادداشت آزمایشی پرونده ثبت کنید؛ این یادداشت سفارش یا تخصیص نیست.');
 const financial=artifactOf(e,'financial_report'),f=financial?JSON.parse(financial.contentJson):null;
 if(!f||f.bridgeRevision!==bridge?.revision||f.planRevision!==plan?.revision||f.sourceReportId!==report?.id)issues.financial_report.push('گزارش مالی نمونه مطابق برنامه، پل ارزش و گزارش جاری تولید کنید.');
 return{issues,report,artifacts:e.artifacts.map(a=>({...a,content:JSON.parse(a.contentJson)}))};
}
