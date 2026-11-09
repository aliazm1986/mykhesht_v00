import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import path from "node:path";
import{Miniflare as BaseMiniflare,convertV4MiniflareOptions}from"miniflare";
class Miniflare extends BaseMiniflare { constructor(options){super(convertV4MiniflareOptions(options));} }
const moduleFiles=(await readdir("dist/server",{recursive:true})).filter(f=>/\.(?:js|mjs)$/.test(f)).sort((a,b)=>a==="index.js"?-1:b==="index.js"?1:a.localeCompare(b));
const mf=new Miniflare({modules:moduleFiles.map(f=>({type:"ESModule",path:path.resolve("dist/server",f)})),modulesRoot:path.resolve("dist/server"),compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"],r2Buckets:["BUCKET"],assets:{directory:path.resolve("dist/client"),binding:"ASSETS",routerConfig:{has_user_worker:true}},bindings:{KHESHT_BOOTSTRAP_ADMIN_USER_ID:"built-worker-admin",KHESHT_MAINTENANCE_MODE:"owner-private",KHESHT_MAINTENANCE_HOST:"khesht.test"}});
let passed=0;
try{
 const db=await mf.getD1Database("DB");
 for(const f of(await readdir("drizzle")).filter(f=>f.endsWith(".sql")).sort())for(const sql of(await readFile(path.join("drizzle",f),"utf8")).split("--> statement-breakpoint").map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 const headers={"oai-authenticated-user-id":"built-worker-admin","oai-authenticated-user-email":"built-worker@example.test"};
 const anon=await mf.dispatchFetch("https://khesht.test/api/projects");assert.equal(anon.status,401);passed++;
 for(const route of["/api/admin/readiness","/pilot-policy","/auth/recovery","/api/auth/session","/api/project-control/queue","/api/review-rules","/api/wealth/metrics","/api/project-control/history?project=niavaran-flip","/projects/niavaran-flip/edit","/market","/auto-invest","/api/projects","/api/member","/api/admin/operations","/api/data-room/documents?project=niavaran-flip","/api/sample-reports?project=niavaran-flip","/api/analysis?project=niavaran-flip","/api/support/tickets","/api/project-control/members?project=niavaran-flip","/api/project-control/artifacts?project=niavaran-flip","/api/project-control/stages?project=niavaran-flip","/dashboard","/projects","/projects/niavaran-flip","/projects/niavaran-flip/documents","/wealth","/portfolio","/admin","/auth"]){
  const response=await mf.dispatchFetch(`https://khesht.test${route}`,{headers});const text=await response.text();assert.equal(response.status,200,`${route}: ${text.slice(0,250)}`);passed++;
 }
 const blocked=await mf.dispatchFetch("https://khesht.test/api/projects",{method:"POST",headers:{...headers,origin:"https://evil.test","content-type":"application/json"},body:"{}"});assert.equal(blocked.status,403);passed++;

 for(const asset of ["worker.min.js","core/tesseract-core-simd-lstm.wasm.js","core/tesseract-core-lstm.wasm.js","lang/fas.traineddata.gz","lang/eng.traineddata.gz"]){
  const response=await mf.dispatchFetch(`https://khesht.test/ocr/${asset}`);
  assert.equal(response.status,200,asset);
  const actual=new Uint8Array(await response.arrayBuffer()),expected=await readFile(path.join("dist/client/ocr",asset));assert.deepEqual(actual,new Uint8Array(expected));passed++;
 }
 const large=await mf.dispatchFetch("https://khesht.test/api/member",{method:"PUT",headers:{...headers,"content-type":"application/json"},body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode("x".repeat(1024*1024+1)));c.close();}}),duplex:"half"});assert.equal(large.status,413);passed++;
 const maintenance=await mf.dispatchFetch("https://khesht.test/api/internal/maintenance",{method:"POST"});assert.equal(maintenance.status,201);assert.equal((await maintenance.json()).result.verified,true);passed++;
 const daily=await mf.dispatchFetch("https://khesht.test/api/internal/maintenance",{method:"POST"});assert.equal((await daily.json()).reused,true);passed++;

 const stranger={"oai-authenticated-user-id":"unassigned-user","oai-authenticated-user-email":"unassigned@example.test"};
 for(const route of ["/api/data-room/documents?project=niavaran-flip","/api/sample-reports?project=niavaran-flip","/api/project-control/artifacts?project=niavaran-flip","/projects/niavaran-flip","/projects/niavaran-flip/documents"]){const r=await mf.dispatchFetch(`https://khesht.test${route}`,{headers:stranger});assert.equal(r.status,404);passed++;}
 const control=await mf.dispatchFetch("https://khesht.test/api/project-control/stages?project=niavaran-flip",{headers});const state=await control.json();
 const change={projectSlug:"niavaran-flip",stageKey:"intake",state:"passed",responsibleRole:"project_manager",decisionReason:"بررسی پذیرش در آزمون Worker ساخته‌شده",revision:state.projectCase.revision};
 const accepted=await mf.dispatchFetch("https://khesht.test/api/project-control/stages",{method:"PUT",headers:{...headers,"content-type":"application/json"},body:JSON.stringify(change)});assert.equal(accepted.status,200);passed++;
 const conflict=await mf.dispatchFetch("https://khesht.test/api/project-control/stages",{method:"PUT",headers:{...headers,"content-type":"application/json"},body:JSON.stringify(change)});assert.equal(conflict.status,409);passed++;
 console.log(JSON.stringify({passed,failed:0,target:"actual production Worker artifact",browserInteractionsTested:false,productionDataTouched:false}));
}finally{await mf.dispose();}
