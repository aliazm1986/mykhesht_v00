import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";
import { Miniflare as BaseMiniflare,convertV4MiniflareOptions } from "miniflare";
class Miniflare extends BaseMiniflare { constructor(options){super(convertV4MiniflareOptions(options));} }
import { backupStatements } from "./backup-sql.mjs";

const root=process.cwd();
const bundle=await build({entryPoints:["tests/backend-worker.ts"],bundle:true,write:false,format:"esm",platform:"neutral",target:"es2022",external:["cloudflare:workers","node:*"],alias:{"next/headers":path.join(root,"tests/request-context.ts"),"next/navigation":path.join(root,"tests/request-context.ts")},logLevel:"error"});
const mf=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],r2Buckets:["BUCKET"],bindings:{KHESHT_BOOTSTRAP_ADMIN_USER_ID:"admin-test-user",KHESHT_MAINTENANCE_MODE:"owner-private",KHESHT_MAINTENANCE_HOST:"khesht.test"},log:undefined});
let checks=0;
const ok=(condition,message)=>{assert.ok(condition,message);checks++;};
async function call(url,{user="admin-test-user",method="GET",body,headers={}}={}){
  const h={...headers};if(user){h["oai-authenticated-user-id"]=user;h["oai-authenticated-user-email"]=`${user}@example.test`;}
  if(url==="/api/project-control/stages"&&method==="PUT"&&body&&body.revision===undefined){const current=await call(`/api/project-control/stages?project=${body.projectSlug}`,{user});body={...body,revision:current.data.projectCase?.revision};}
  if(/^\/api\/data-room\/documents\/[^/]+\/(review|extraction)$/.test(url)&&method==="POST"&&body&&body.revision===undefined){const current=await call(url.replace(/\/(review|extraction)$/,"/extraction"),{user});body={...body,revision:current.data.documentRevision};}
  let payload=body;
  if(body instanceof FormData){const encoded=new Request("https://khesht.test/upload",{method:"POST",body});h["content-type"]=encoded.headers.get("content-type");payload=new Uint8Array(await encoded.arrayBuffer());}
  else if(body!==undefined){h["content-type"]="application/json";payload=JSON.stringify(body);}
  const r=await mf.dispatchFetch(`https://khesht.test${url}`,{method,headers:h,body:payload});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return{status:r.status,data,headers:r.headers};
}
try{
 const db=await mf.getD1Database("DB");
 for(const file of(await readdir("drizzle")).filter(f=>f.endsWith(".sql")).sort()){
  for(const statement of(await readFile(path.join("drizzle",file),"utf8")).split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 ok((await call("/api/projects",{user:null})).status===401,"Anonymous request must fail");
 const concurrent=await Promise.all([call("/api/projects",{user:"viewer-test-user"}),call("/api/projects",{user:"viewer-test-user"})]);
 ok(concurrent.every(r=>r.status===200),"Concurrent profile creation must be idempotent");
 ok((await call("/api/projects",{user:"viewer-test-user",method:"POST",body:{}})).status===400,"Invalid project payload rejected");
 const definition={slug:"integration-case",name:"پروژهٔ آزمون",location:"تهران · آزمون",description:"پروندهٔ آزمایشی جداگانه برای آزمون یکپارچهٔ پایلوت",outcome:"بازسازی و مرور خروج فرضی",investmentModel:"flip",type:"مسکونی",horizonMonths:12,progress:10,riskLevel:"متوسط",latitude:35.8,longitude:51.4,image:"/pilot-assets/flip-niavaran-after.png",risks:[{title:"تأخیر ساخت",level:"متوسط",trigger:"افزایش زمان",response:"ذخیرهٔ احتیاطی هزینه"}]};
 let r=await call("/api/projects",{method:"POST",body:{definition,revision:0}});ok(r.status===201,"Admin can create project");
 for(const[userId,role]of [["viewer-test-user","investor"],["expert-test-user","expert"]]){await call("/api/projects",{user:userId});ok((await call("/api/project-control/members",{method:"PUT",body:{projectSlug:"integration-case",userId,role,active:true}})).status===200,"Project membership assigned");}
 ok((await call("/api/projects",{user:"viewer-test-user",method:"POST",body:{definition,revision:1}})).status===403,"Viewer cannot edit project definition");
 ok((await call("/api/projects",{method:"POST",body:{definition,revision:0}})).status===409,"Stale update rejected");
 const edits=await Promise.all([call("/api/projects",{method:"POST",body:{definition,revision:1}}),call("/api/projects",{method:"POST",body:{definition:{...definition,name:"عنوان دیگر"},revision:1}})]);
 ok(edits.filter(r=>r.status===200).length===1&&edits.filter(r=>r.status===409).length===1,"Concurrent edit prevents lost update");
 const rooms=await Promise.all([call("/api/data-room/documents?project=integration-case"),call("/api/data-room/documents?project=integration-case")]);
 ok(rooms.every(r=>r.status===200&&r.data.stages.length===9),"Case initialization creates exactly nine stages");
 ok(rooms[0].data.stages.filter(s=>s.state==="active").length===1,"Only intake active initially");
 ok((await call("/api/project-control/stages",{method:"PUT",body:{projectSlug:"integration-case",stageKey:"data_room",state:"active",responsibleRole:"expert",decisionReason:"آزمون تعارض"}})).status===422,"Stage prerequisites reject skipping intake");
 await call("/api/project-control/stages",{method:"PUT",body:{projectSlug:"integration-case",stageKey:"intake",state:"passed",responsibleRole:"project_manager",decisionReason:"پذیرش آزمایشی مرور شد"}});
 const revision=(await call("/api/project-control/stages?project=integration-case")).data.projectCase.revision;
 const activeRace=await Promise.all([1,2].map(()=>call("/api/project-control/stages",{method:"PUT",body:{projectSlug:"integration-case",stageKey:"data_room",state:"active",responsibleRole:"expert",decisionReason:"آزمون هم‌زمانی کنترل نسخه",revision}})));
 ok(activeRace.filter(r=>r.status===200).length===1&&activeRace.filter(r=>r.status===409).length===1,"Database enforces exactly one active stage under concurrency");
 ok((await call("/api/sample-reports",{method:"POST",body:{projectSlug:"integration-case"}})).status===422,"Unread sources cannot generate reports");
 const upload=async(accessLevel,text)=>{const form=new FormData();form.set("projectSlug","integration-case");form.set("title",text?"منبع خوانده‌شده":"فایل خام خوانده‌نشده");form.set("category","اسناد فنی");form.set("accessLevel",accessLevel);form.set("file",new Blob(["Khesht test source bytes"],{type:"text/plain"}),"source.txt");if(text){form.set("extractedText",text);form.set("extractionSourceKind","manual_entry");}return call("/api/data-room/documents",{method:"POST",body:form});};
 const unread=await upload("project_team",null);ok(unread.status===201&&unread.data.document.extraction.state==="pending",`Raw file remains unread: ${JSON.stringify(unread.data)}`);
 const source=await upload("project_team","متن خوانده‌شدهٔ فنی آزمون با بررسی مراحل بازسازی و هزینهٔ پروژه.");ok(source.status===201&&source.data.document.extraction.state==="complete","Read text stored separately");
 const secret=await upload("admin","منبع محرمانه مخصوص مدیر");ok(secret.status===201,"Private admin source uploaded");
 ok((await call(`/api/data-room/documents/${secret.data.document.id}`,{user:"viewer-test-user"})).status===403,"Restricted file download blocked");
 await call("/api/projects",{user:"expert-test-user"});
 ok((await call("/api/control/roles",{method:"POST",body:{userId:"expert-test-user",role:"expert"}})).status===200,"Admin grants expert role");
 ok((await call(`/api/data-room/documents/${secret.data.document.id}/review`,{user:"expert-test-user",method:"POST",body:{outcome:"approved",note:"آزمون ممنوع"}})).status===404,"Expert cannot review admin-only document");
 const d=source.data.document;
 ok((await call(`/api/data-room/documents/${d.id}`)).data==="Khesht test source bytes","Private file round trip preserves bytes");
 ok((await call(`/api/data-room/documents/${d.id}/review`,{method:"POST",body:{outcome:"approved",note:"متن مرور شد"}})).status===409,"Uploader cannot approve own source");
 ok((await call(`/api/data-room/documents/${d.id}/review`,{user:"expert-test-user",method:"POST",body:{outcome:"approved",note:"متن توسط کارشناس دیگر مرور شد"}})).status===200,"Separate reviewer approves document");
 ok((await call(`/api/data-room/documents/${d.id}/extraction`,{method:"POST",body:{textContent:"متن اصلاح‌شده برای آزمون بازبینی مجدد"}})).status===200,"Text correction stored");
 const afterEdit=await call("/api/data-room/documents?project=integration-case");ok(afterEdit.data.documents.find(x=>x.id===d.id).reviewStatus==="pending","Editing text invalidates prior review");
 const input={acquisitionCost:1000,renovationCost:100,otherCost:100,debt:200,debtAnnualRate:12,expectedExitValue:1600,monthlyRent:10,monthlyExpenses:2,vacancyPercent:10,sellingFeePercent:5,durationMonths:12,investorAmount:100};
 const analysis=await call("/api/analysis",{method:"POST",body:{projectSlug:"integration-case",name:"محاسبهٔ مرجع",input}});ok(analysis.status===201,"Financial run saved");
 const base=analysis.data.run.results.find(x=>x.key==="base");ok(base.profit===380&&base.equity===1000&&base.investorProfit===38,"Cost, debt, rent and exit calculation verified");
 ok((await call("/api/analysis?project=integration-case",{user:"viewer-test-user"})).data.runs.length===0,"Financial scenarios isolated by owner");
 ok((await call("/api/analysis",{method:"POST",body:{projectSlug:"integration-case",input:{...input,debt:1200}}})).status===400,"Zero equity rejected");
 const report=await call("/api/sample-reports",{method:"POST",body:{projectSlug:"integration-case",scopeNote:"آزمون گزارش"}});ok(report.status===201,"Draft generated from read text");
 ok(!report.data.report.sourceDocumentIds.includes(unread.data.document.id),"Unread file excluded from report sources");
 ok(report.data.report.content.financialScenario.id===analysis.data.run.id,"Report contains saved financial snapshot");
 ok(report.data.report.content.projectSummary.risks.length===1,"Report contains project risk snapshot");
 const expertReports=await call("/api/sample-reports?project=integration-case",{user:"expert-test-user"});ok(expertReports.data.reports.length===0,"Restricted source cannot leak via report");
 ok((await call(`/api/sample-reports?project=integration-case&download=${report.data.report.id}`)).headers.get("content-disposition")?.startsWith("attachment"),"Report export is downloadable");
 const ticket=await call("/api/support/tickets",{user:"viewer-test-user",method:"POST",body:{subject:"آزمون پشتیبانی",category:"فنی",message:"درخواست بررسی ذخیرهٔ سند"}});ok(ticket.status===201,"Support ticket persisted");
 ok((await call("/api/support/tickets",{user:"expert-test-user"})).data.data.length===0,"Support tickets isolated by owner");
 ok((await call("/api/support/tickets",{user:"expert-test-user",method:"PUT",body:{id:ticket.data.data.id,message:"دسترسی نامجاز"}})).status===404,"Other user cannot reply to private ticket");
 ok((await call("/api/support/tickets",{method:"PUT",body:{id:ticket.data.data.id,message:"پاسخ مدیر ثبت شد"}})).status===200,"Admin reply saved");
 ok((await call("/api/member?section=notifications",{user:"viewer-test-user"})).data.data.length===1,"Reply creates private notification");
 ok((await call("/api/member",{user:"viewer-test-user",method:"PUT",body:{action:"read_all"}})).data.data.count===1,"Notification read state persists");
 ok((await call("/api/member",{user:"viewer-test-user",method:"PUT",body:{firstName:"کاربر",lastName:"آزمون",mobile:"09120000000",role:"admin"}})).status===200,"Profile updates allowed fields");
 ok((await call("/api/member",{user:"viewer-test-user"})).data.data.role==="viewer","Profile cannot escalate role");
 ok((await call("/api/admin/operations",{user:"viewer-test-user"})).status===403,"Admin diagnostics access enforced");
 ok((await call("/api/admin/operations")).data.health.storage==="ok","Database and storage health verified");
 const backup=await call("/api/admin/backups",{method:"POST"});ok(backup.status===201&&backup.data.fileCount===3,"Snapshot includes raw file copies");
 ok((await call("/api/admin/backups",{method:"PUT",body:{id:backup.data.id}})).data.verified===true,"Backup checksums validated");
 ok((await call("/api/admin/backups?retention=1")).data.automaticDeletion===false,"Retention plan does not automatically delete backups");
 ok((await call("/api/admin/backups",{method:"DELETE",body:{id:backup.data.id,confirm:"delete_expired_backup"}})).status===409,"Retention protects fresh backups");
 const archiveResponse=await mf.dispatchFetch(`https://khesht.test/api/admin/backups?id=${backup.data.id}&format=tar`,{headers:{'oai-authenticated-user-id':'admin-test-user','oai-authenticated-user-email':'admin-test-user@example.test'}});
 ok(archiveResponse.status===200&&archiveResponse.headers.get('content-type')==='application/x-tar','Complete backup archive is downloadable by admin');
 const tar=new Uint8Array(await archiveResponse.arrayBuffer()),archiveEntries=new Map();let offset=0;
 while(offset+512<=tar.length&&tar[offset]!==0){const block=tar.slice(offset,offset+512),name=new TextDecoder().decode(block.slice(0,100)).replace(/\0.*$/s,''),size=parseInt(new TextDecoder().decode(block.slice(124,136)).replace(/\0.*$/s,''),8);offset+=512;archiveEntries.set(name,tar.slice(offset,offset+size));offset+=Math.ceil(size/512)*512;}
 const archiveManifest=JSON.parse(new TextDecoder().decode(archiveEntries.get('manifest.json')));ok(archiveManifest.files.length===3&&archiveEntries.size===4,'TAR includes manifest and every raw source');
 const hashes=await Promise.all(archiveManifest.files.map(async f=>{const bytes=archiveEntries.get(`files/${f.documentId}.bin`);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')===f.checksum;}));ok(hashes.every(Boolean),'Every exported archive file matches manifest checksum');
 const exported=await call(`/api/admin/backups?id=${backup.data.id}`);ok(exported.data.format==="khesht-pilot-backup-v1"&&exported.data.tables.projectDefinitions.length===1,"Backup data export verified");
 const recovery=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],r2Buckets:["BUCKET"],bindings:{KHESHT_BOOTSTRAP_ADMIN_USER_ID:"admin-test-user"}});
 try{
  const restoreDb=await recovery.getD1Database("DB");
  for(const file of(await readdir("drizzle")).filter(f=>f.endsWith(".sql")).sort())for(const sql of(await readFile(path.join("drizzle",file),"utf8")).split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean))await restoreDb.prepare(sql).run();
  for(const sql of backupStatements(exported.data))await restoreDb.prepare(sql).run();
  const recovered=await restoreDb.prepare("SELECT COUNT(*) AS count FROM financial_runs").first();
  ok(recovered.count===1,"Backup restores financial records into a separate fresh database");
  const sourceBucket=await mf.getR2Bucket("BUCKET"),targetBucket=await recovery.getR2Bucket("BUCKET");
  for(const file of exported.data.files){const object=await sourceBucket.get(file.backupKey);await targetBucket.put(file.originalKey,await object.arrayBuffer());}
  const raw=await targetBucket.get(exported.data.files[0].originalKey);
  ok(await raw.text()==="Khesht test source bytes","Raw files recover from copied R2 objects");
 }finally{await recovery.dispose();}
 await db.prepare("DELETE FROM request_limits WHERE key='admin-test-user:backup'").run();
 const storedBucket=await mf.getR2Bucket("BUCKET");
 await storedBucket.put(exported.data.files[0].backupKey,"corrupted-test-copy");
 ok((await call("/api/admin/backups",{method:"PUT",body:{id:backup.data.id}})).status===409,"Backup verification detects corrupted file bytes");
 const wealth=await call("/api/wealth/scenarios",{user:"viewer-test-user",method:"POST",body:{name:"سناریوی سرور",selectedProjectSlugs:["integration-case"],virtualBudget:1000000,horizonMonths:18,analysisStyle:"balanced",snapshot:{weightedReturn:999999}}});
 ok(wealth.status===201&&JSON.parse(wealth.data.scenario.snapshotJson).weightedReturn!==999999,"Wealth snapshot computed server-side instead of trusting client");
 const other=await call("/api/projects",{user:"rate-limit-test"});ok(other.status===200,"Rate test identity ready");
 ok((await call("/api/projects",{method:"POST",body:{definition,revision:2},headers:{origin:"https://evil.test"}})).status===403,"Cross-origin writes blocked");
 await db.prepare("INSERT INTO request_limits(key,window_start,count) VALUES(?,?,80) ON CONFLICT(key) DO UPDATE SET count=80,window_start=excluded.window_start").bind("rate-limit-test:write",Math.floor(Date.now()/60000)).run();
 r=await call("/api/member",{user:"rate-limit-test",method:"PUT",body:{firstName:"Test",lastName:"",mobile:""}});
 ok(r.status===429,"Rate limit enforced across requests");
 ok((await call("/api/control/roles",{method:"POST",body:{userId:"admin-test-user",role:"viewer"}})).status===409,"Current admin cannot lock out management");

 const scanned=new FormData();for(const[k,v]of Object.entries({projectSlug:"integration-case",title:"آزمون متن OCR",category:"اسناد فنی",accessLevel:"project_team",extractedText:"متن تشخیص‌داده‌شدهٔ آزمایش که تا تأیید نباید استفاده شود",extractionSourceKind:"browser_ocr",extractionPageCount:"1",extractionEvidence:JSON.stringify([{page:1,method:"ocr",confidence:90}])}))scanned.set(k,v);
 scanned.set("file",new Blob(["isolated scanned bytes"],{type:"image/png"}),"scan.png");
 const ocr=await call("/api/data-room/documents",{method:"POST",body:scanned});
 ok(ocr.status===201&&ocr.data.document.extraction.state==="needs_review","OCR text requires human confirmation");
 const ocrId=ocr.data.document.id;
 const beforeConfirmation=await call("/api/sample-reports?project=integration-case");
 ok(!beforeConfirmation.data.sources.some(s=>s.id===ocrId),"Unconfirmed OCR excluded from report sources");
 ok((await call(`/api/data-room/documents/${ocrId}/extraction`,{user:"viewer-test-user",method:"POST",body:{textContent:"forbidden",confirmOcr:true}})).status===403,"Viewer cannot confirm OCR");
 ok((await call(`/api/data-room/documents/${ocrId}/extraction`,{method:"POST",body:{textContent:"متن OCR با اصل سند تطبیق داده و اصلاح شد",confirmOcr:true}})).data.sourceKind==="ocr_human_confirmed","Human OCR confirmation retains provenance");
 const provenance=await call(`/api/data-room/documents/${ocrId}/extraction`);
 ok(provenance.data.metadata.pages[0].confidence===90&&provenance.data.metadata.humanConfirmedBy==="admin-test-user","OCR evidence and confirming actor preserved");
 ok((await call(`/api/data-room/documents/${d.id}/extraction`,{method:"POST",body:{textContent:"wrong origin",confirmOcr:true}})).status===409,"Cannot falsely label manually entered text as OCR");
 const large=await mf.dispatchFetch("https://khesht.test/api/member",{method:"PUT",headers:{"oai-authenticated-user-id":"size-test-user","content-type":"application/json"},body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode("x".repeat(1024*1024+1)));c.close();}}),duplex:"half"});
 ok(large.status===413,"Chunked request without Content-Length enforces byte limit");
 ok((await call("/api/internal/maintenance",{user:"viewer-test-user",method:"POST"})).status===403,"Member cannot run shared maintenance");
 const maintenanceRace=await Promise.all([call("/api/internal/maintenance",{user:null,method:"POST"}),call("/api/internal/maintenance",{user:null,method:"POST"})]);
 ok(maintenanceRace.filter(r=>r.status===201).length===1,"Service maintenance concurrency creates one daily backup");
 const repeat=await call("/api/internal/maintenance",{user:null,method:"POST"});
 ok(repeat.status===200&&repeat.data.reused===true&&repeat.data.result.verified===true,"Repeated daily maintenance reuses verified result");
 const readback=await call("/api/internal/maintenance",{user:null});
 ok(readback.data.runs.length===1&&readback.data.runs[0].state==="complete","Service execution result persisted and read back");

 { // Complete a dossier with separate project-scoped producer and reviewer.
 await db.prepare("DELETE FROM request_limits WHERE key LIKE 'admin-test-user:%'").run();
 const flowDef={...definition,slug:"workflow-case",name:"پروندهٔ آزمون مسیر کامل"};
 ok((await call("/api/projects",{method:"POST",body:{definition:flowDef,revision:0}})).status===201,"Create end-to-end dossier");
 for(const[userId,role]of [["producer-test","project_manager"],["reviewer-test","independent_reviewer"]]){
  await call("/api/projects",{user:userId});
  ok((await call("/api/project-control/members",{method:"PUT",body:{projectSlug:"workflow-case",userId,role,active:true}})).status===200,"Assign project-local role");
 }
 ok((await call("/api/projects",{user:"producer-test"})).data.projects.every(p=>p.definition.slug==="workflow-case"),"Catalog only lists assigned projects");
 ok((await call("/api/data-room/documents?project=workflow-case",{user:"expert-test-user"})).status===404,"Global expert cannot access an unassigned project");
 ok((await call("/api/project-control/members",{user:"producer-test",method:"PUT",body:{projectSlug:"workflow-case",userId:"viewer-test-user",role:"expert",active:true}})).status===403,"Project manager cannot grant membership");
 const roleByStage={intake:"project_manager",data_room:"expert",investment_plan:"project_manager",sample_report:"expert",value_bridge:"expert",independent_review:"independent_reviewer",closed_pilot_register:"project_manager",scenario_log:"expert",financial_report:"project_manager"};
 async function step(stageKey,state,user="producer-test",extra={}){return call("/api/project-control/stages",{user,method:"PUT",body:{projectSlug:"workflow-case",stageKey,state,responsibleRole:roleByStage[stageKey],decisionReason:"شواهد این مرحله در آزمون کامل مرور شد",...extra}});}
 async function artifact(kind,extra={}){const s=await call("/api/project-control/artifacts?project=workflow-case",{user:"producer-test"});return call("/api/project-control/artifacts",{user:"producer-test",method:"POST",body:{projectSlug:"workflow-case",kind,revision:s.data.revision,artifactRevision:s.data.artifacts.find(a=>a.kind===kind)?.revision??0,...extra}});}
 ok((await step("intake","passed")).status===200,"Pass intake with project scope and risks");
 const f=new FormData();for(const[k,v]of Object.entries({projectSlug:"workflow-case",title:"مدرک نمونهٔ مسیر کامل",category:"اسناد فنی",accessLevel:"project_team",extractedText:"متن ساختگی برای آزمون مسیر پرونده؛ سند ملک واقعی نیست.",extractionSourceKind:"manual_entry"}))f.set(k,v);
 f.set("file",new Blob(["Closed pilot fixture"],{type:"text/plain"}),"workflow-fixture.txt");
 const doc=await call("/api/data-room/documents",{user:"producer-test",method:"POST",body:f});
 ok(doc.status===201,"Project-local manager uploads evidence");
 ok((await step("data_room","active")).status===200,"Activate data room");
 ok((await step("data_room","passed")).status===422,"Unreviewed sources block stage completion");
 ok((await call(`/api/data-room/documents/${doc.data.document.id}/review`,{user:"reviewer-test",method:"POST",body:{outcome:"approved",note:"مدرک آزمون توسط فرد دیگر مرور شد"}})).status===200,"Independent member approves source");
 ok((await step("data_room","passed")).status===200,"Pass data room with approved evidence");
 const run=await call("/api/analysis",{user:"producer-test",method:"POST",body:{projectSlug:"workflow-case",name:"برنامهٔ مالی آزمون",input}});
 ok(run.status===201,"Producer enters financial inputs and receives calculated output");
 ok((await artifact("investment_plan",{runId:run.data.run.id})).status===201,"Select explicit financial plan snapshot");
 ok((await step("investment_plan","active")).status===200&&(await step("investment_plan","passed")).status===200,"Complete investment plan stage");
 const report=await call("/api/sample-reports",{user:"producer-test",method:"POST",body:{projectSlug:"workflow-case"}});
 ok(report.status===201,"Generate dossier report with source fingerprint");
 ok((await step("sample_report","active")).status===200&&(await step("sample_report","passed")).status===200,"Pass report based on current approved evidence");
 const bridge=await artifact("value_bridge",{input:{assetValue:1000,liabilities:100,reserves:100,unitCount:10,basisNote:"ارقام کاملاً فرضی برای آزمون فرمول"}});
 ok(bridge.status===201&&bridge.data.artifact.content.illustrativeUnitValue===80&&bridge.data.artifact.content.approvedOfferPrice===null,"Unit bridge computes 80 without setting an offer price");
 ok((await step("value_bridge","active")).status===200&&(await step("value_bridge","passed")).status===200,"Pass unit bridge stage");
 ok((await step("independent_review","active")).status===200,"Activate independent review");
 ok((await step("independent_review","passed")).status===422,"Producer cannot independently approve own dossier");
 ok((await step("independent_review","passed","admin-test-user")).status===422,"Dossier registrant cannot act as independent approver");
 ok((await step("independent_review","passed","reviewer-test")).status===200,"Separate assigned reviewer approves dossier");
 ok((await step("closed_pilot_register","active")).status===200&&(await step("closed_pilot_register","passed")).status===200,"Pass closed pilot record");
 ok((await step("scenario_log","active")).status===200&&(await step("scenario_log","passed")).status===422,"Scenario stage requires saved nonfinancial note");
 ok((await call("/api/pilot/records",{user:"producer-test",method:"POST",body:{projectSlug:"workflow-case",kind:"review",note:"سناریوی فرضی؛ بدون سفارش یا تخصیص واقعی"}})).status===201,"Save illustrative scenario note");
 ok((await step("scenario_log","passed")).status===200,"Pass scenario evidence");
 ok((await artifact("financial_report")).status===201,"Generate final sample financial report");
 ok((await step("financial_report","active")).status===200&&(await step("financial_report","passed")).status===200,"Complete all nine stages");
 const complete=await call("/api/project-control/stages?project=workflow-case",{user:"producer-test"});
 ok(complete.data.projectCase.status==="pilot_complete"&&complete.data.stages.every(s=>s.state==="passed"),"Complete dossier state persisted");
 ok((await call("/api/project-control/artifacts?project=workflow-case&download=financial_report",{user:"reviewer-test"})).headers.get("content-disposition")?.startsWith("attachment"),"Final financial report export downloads");
 ok((await step("intake","active","producer-test",{reopenDownstream:false})).status===422,"Reopening requires acknowledgement");
 ok((await call("/api/review-rules",{user:"reviewer-test",method:"PUT",body:{enabled:true,trigger:"all",tracks:["داده","مالی"]}})).status===200,"Persist review notification rule");
 ok((await step("independent_review","active","producer-test",{reopenDownstream:true})).status===200,"Reopen independent approval for freshness regression");
 const historicalExport=await call("/api/project-control/artifacts?project=workflow-case&download=financial_report",{user:"reviewer-test"});
 ok(historicalExport.data.current===false,"Financial artifact is stale after approval reopens");
 const paged=await call("/api/project-control/report?project=workflow-case",{user:"reviewer-test"});
 ok(paged.status===200&&paged.data.includes("نسخهٔ تاریخی")&&paged.data.includes("dir=\"rtl\""),"Standalone Persian report marks reopened approvals as historical");
 const notified=await call("/api/member?section=notifications",{user:"reviewer-test"});
 ok(notified.data.data.some(n=>n.href==="/projects/workflow-case/documents"),"Stage mutation creates real subscribed notification");
 const versionList=await call("/api/project-control/history?project=workflow-case",{user:"reviewer-test"});
 ok(versionList.status===200&&versionList.data.versions.length>0,"Version history is readable by assigned reviewer");
 const versionDetail=await call(`/api/project-control/history?project=workflow-case&id=${versionList.data.versions[0].id}`,{user:"reviewer-test"});
 ok(versionDetail.data.snapshot!==undefined,"Historical evidence snapshot retained");
 let immutable=false;try{await db.prepare("UPDATE record_versions SET actor_id='tamper'").run();}catch{immutable=true;}
 ok(immutable,"Database rejects history modification");
 const metric=await call("/api/wealth/metrics?project=workflow-case",{user:"producer-test"});
 ok(metric.data.metrics[0].rates.base===base.roiPercent,"Wealth metrics use the selected server financial plan");
 const queue=await call("/api/project-control/queue",{user:"producer-test"});
 ok(queue.data.projects.length===1&&queue.data.projects[0].slug==="workflow-case","Queue reads real assigned custom project");
 const before=(await call(`/api/data-room/documents/${doc.data.document.id}/extraction`,{user:"producer-test"})).data.documentRevision;
 ok((await call(`/api/data-room/documents/${doc.data.document.id}/extraction`,{user:"producer-test",method:"POST",body:{textContent:"متن جدید ساختگی پس از تأیید نهایی برای آزمون ابطال"}})).status===200,"Edit source after final approval");
 ok((await call(`/api/data-room/documents/${doc.data.document.id}/review`,{user:"reviewer-test",method:"POST",body:{outcome:"approved",note:"نسخهٔ قدیمی نباید تأیید شود",revision:before}})).status===409,"Stale document approval rejected");
 const invalidated=await call("/api/project-control/stages?project=workflow-case",{user:"producer-test"});
 ok(invalidated.data.projectCase.status==="active"&&invalidated.data.stages.find(s=>s.stageKey==="intake").state==="passed"&&invalidated.data.stages.filter(s=>s.stageKey!=="intake").every(s=>s.state==="pending"),"Source edit invalidates every dependent approval");
 const history=await call("/api/sample-reports?project=workflow-case",{user:"producer-test"});
 ok(history.data.reports.find(r=>r.id===report.data.report.id).isCurrent===false,"Historical report visibly stale");
 const snapshot=await call("/api/admin/backups",{method:"POST"});
 ok(snapshot.status===201,"Backup captures scoped workflow");
 const snapshotData=await call(`/api/admin/backups?id=${snapshot.data.id}`);
 ok(snapshotData.data.tables.caseArtifacts.length===3&&snapshotData.data.tables.projectMemberships.length>=5,"Backup includes artifacts and project membership");
 const drill=new Miniflare({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],r2Buckets:["BUCKET"],bindings:{KHESHT_BOOTSTRAP_ADMIN_USER_ID:"admin-test-user"}});
 try{
  const restored=await drill.getD1Database("DB");
  for(const file of(await readdir("drizzle")).filter(f=>f.endsWith(".sql")).sort())for(const sql of(await readFile(path.join("drizzle",file),"utf8")).split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean))await restored.prepare(sql).run();
  for(const sql of backupStatements(snapshotData.data))await restored.prepare(sql).run();
  ok((await restored.prepare("SELECT COUNT(*) AS count FROM case_artifacts").first()).count===3,"Restore workflow artifacts into a separate fresh database");
  const member=await restored.prepare("SELECT role FROM project_memberships WHERE user_id='reviewer-test' AND project_slug='workflow-case'").first();ok(member.role==="independent_reviewer","Restore project-local permissions");
  const target=await drill.getR2Bucket("BUCKET"),source=await mf.getR2Bucket("BUCKET");
  for(const file of snapshotData.data.files){const object=await source.get(file.backupKey);await target.put(file.originalKey,await object.arrayBuffer());}
  const response=await drill.dispatchFetch("https://khesht.test/api/project-control/artifacts?project=workflow-case",{headers:{"oai-authenticated-user-id":"reviewer-test","oai-authenticated-user-email":"reviewer@example.test"}});
  ok(response.status===200&&(await response.json()).artifacts.length===3,"Restored API authorizes dossier via restored membership");
 }finally{await drill.dispose();}
 ok((await call("/api/project-control/members",{method:"PUT",body:{projectSlug:"workflow-case",userId:"producer-test",role:"project_manager",active:false}})).status===200,"Revoke dossier member");
 for(const url of ["/api/data-room/documents?project=workflow-case","/api/analysis?project=workflow-case","/api/sample-reports?project=workflow-case","/api/project-control/artifacts?project=workflow-case",`/api/data-room/documents/${doc.data.document.id}`]){
  ok((await call(url,{user:"producer-test"})).status===404,"Revocation closes each dossier endpoint");
 }
 ok((await call("/api/member?section=documents",{user:"producer-test"})).data.data.length===0,"Member document list excludes revoked dossier");

 }
 await db.prepare("DELETE FROM request_limits WHERE key LIKE 'admin-test-user:%'").run();
 const registry=(await call("/api/projects")).data.projects.find(p=>p.definition.slug==="integration-case");
 const beforeRace=await call("/api/project-control/stages?project=integration-case");
 const races=await Promise.all(["عنوان برندهٔ اول","عنوان برندهٔ دوم"].map(name=>call("/api/projects",{method:"POST",body:{definition:{...registry.definition,name},revision:registry.revision}})));
 const afterRace=await call("/api/project-control/stages?project=integration-case"),winner=races.find(r=>r.status===200);
 ok(races.filter(r=>r.status===409).length===1,"Reject concurrent registry write");
 ok(afterRace.data.projectCase.title===winner.data.project.definition.name,"Rejected registry write cannot change case title");
 ok(afterRace.data.projectCase.revision===beforeRace.data.projectCase.revision+1,"Rejected registry write cannot invalidate stages");
 const rawBucket=await mf.getR2Bucket("BUCKET"),originals=await db.prepare("SELECT storage_key FROM data_room_documents").all(),missing=originals.results[1].storage_key;
 const raw=await rawBucket.get(missing),rawBytes=await raw.arrayBuffer();await rawBucket.delete(missing);
 const beforeObjects=(await rawBucket.list({prefix:"private-backups/",limit:1000})).objects.length;
 const failedCopy=await call("/api/admin/backups",{method:"POST"});
 ok(failedCopy.status===409&&(await rawBucket.list({prefix:"private-backups/",limit:1000})).objects.length===beforeObjects,"Failed backup removes every partial object");
 await rawBucket.put(missing,rawBytes);
 const v=await db.prepare("SELECT revision FROM project_definitions WHERE slug='integration-case'").first();
 await db.prepare("CREATE TRIGGER reject_history_fixture BEFORE INSERT ON record_versions WHEN NEW.project_slug='integration-case' BEGIN SELECT RAISE(ABORT,'test history failure'); END").run();
 const failedMutation=await call("/api/projects",{method:"POST",body:{definition:registry.definition,revision:v.revision}});
 ok(failedMutation.status===500&&(await db.prepare("SELECT revision FROM project_definitions WHERE slug='integration-case'").first()).revision===v.revision,"History failure rolls back the originating mutation");
 await db.prepare("DROP TRIGGER reject_history_fixture").run();
 const timings=await Promise.all(Array.from({length:60},async()=>{const started=performance.now();const response=await call("/api/projects");assert.equal(response.status,200);return performance.now()-started;}));
 timings.sort((a,b)=>a-b);
 ok(timings.length===60,"Sixty concurrent reads complete in isolated environment");
 console.log(JSON.stringify({isolatedLoad:{concurrentReads:60,p50Ms:Math.round(timings[29]),p95Ms:Math.round(timings[56]),productionCapacityClaim:false}}));
 console.log(JSON.stringify({passed:checks,failed:0,environment:"isolated Miniflare D1/R2",productionDataTouched:false}));
}finally{await mf.dispose();}
