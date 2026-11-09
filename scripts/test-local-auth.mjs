import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {pbkdf2Sync} from 'node:crypto';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const password='test-only long password for local harness',salt='isolated-salt',hash=`pbkdf2-sha256:100000:${salt}:${pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex')}`;
const bundle=await build({entryPoints:['tests/backend-worker.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers','node:*'],alias:{'next/headers':path.resolve('tests/request-context.ts'),'next/navigation':path.resolve('tests/request-context.ts')},logLevel:'error'});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{KHESHT_AUTH_MODE:'local-session',KHESHT_LOCAL_OWNER_EMAIL:'owner@example.test',KHESHT_LOCAL_PASSWORD_HASH:hash,KHESHT_BOOTSTRAP_ADMIN_USER_ID:'local-owner'}}));
let passed=0;const ok=(c,m)=>{assert.ok(c,m);passed++;};const cookies={};
async function call(url,{user='owner',method='GET',body,headers={}}={}){let payload=body;const h={...headers};if(cookies[user])h.cookie=cookies[user];if(body instanceof FormData){const q=new Request('https://khesht.test',{method:'POST',body});h['content-type']=q.headers.get('content-type');payload=new Uint8Array(await q.arrayBuffer());}else if(body!==undefined){h['content-type']='application/json';payload=JSON.stringify(body);}const r=await mf.dispatchFetch('https://khesht.test'+url,{method,headers:h,body:payload});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:r.status,data,headers:r.headers};}
async function login(key,email,selectedPassword=password){const r=await call('/api/auth/session',{user:'none',method:'POST',body:{email,password:selectedPassword}});ok(r.status===200,`Real local login ${key}`);const c=r.headers.get('set-cookie');ok(c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Strict'),'Cookie is restricted');cookies[key]=c.split(';')[0];}
try{
 const db=await mf.getD1Database('DB');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const s of(await readFile(path.join('drizzle',f),'utf8')).split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(s).run();
 ok((await call('/api/projects',{user:'none',headers:{'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@example.test'}})).status===401,'Standalone ignores spoofed Sites identity');
 ok((await call('/api/auth/session',{user:'none',method:'POST',body:{email:'owner@example.test',password:'wrong'}})).status===401,'Reject incorrect password');
 await login('owner','owner@example.test');ok((await call('/api/projects')).status===200,'Authenticated owner can use backend');
 const ids={};for(const key of ['producer','reviewer','investor']){const r=await call('/api/admin/local-accounts',{method:'POST',body:{email:key+'@example.test',password}});ok(r.status===201,'Create separate local account');ids[key]=r.data.id;await login(key,key+'@example.test');}
 const definition={slug:'cookie-case',name:'پروندهٔ نشست واقعی',location:'تهران · آزمون',description:'پروندهٔ جداگانه برای آزمون مسیر کامل با حساب و نشست واقعی',outcome:'مرور بازسازی فرضی و گزارش نمونه',investmentModel:'flip',type:'مسکونی',horizonMonths:12,progress:10,riskLevel:'متوسط',latitude:35.8,longitude:51.4,image:'/pilot-assets/flip-niavaran-after.webp',risks:[{title:'تأخیر ساخت',level:'متوسط',trigger:'افزایش زمان',response:'ذخیرهٔ احتیاطی'}]};
 ok((await call('/api/projects',{method:'POST',body:{definition,revision:0}})).status===201,'Create dossier with owner session');
 for(const[key,role]of [['producer','project_manager'],['reviewer','independent_reviewer'],['investor','investor']])ok((await call('/api/project-control/members',{method:'PUT',body:{projectSlug:definition.slug,userId:ids[key],role,active:true}})).status===200,'Grant scoped membership');
 ok((await call('/api/admin/operations',{user:'investor',headers:{'oai-authenticated-user-id':'local-owner','oai-authenticated-user-email':'owner@example.test'}})).status===403,'Cookie identity defeats spoofed privilege header');
 const roles={intake:'project_manager',data_room:'expert',investment_plan:'project_manager',sample_report:'expert',value_bridge:'expert',independent_review:'independent_reviewer',closed_pilot_register:'project_manager',scenario_log:'expert',financial_report:'project_manager'};
 async function step(stageKey,state,user='producer'){const s=await call('/api/project-control/stages?project=cookie-case',{user});const r=await call('/api/project-control/stages',{user,method:'PUT',body:{projectSlug:'cookie-case',stageKey,state,revision:s.data.projectCase.revision,responsibleRole:roles[stageKey],decisionReason:'شواهد ساختگی با نشست مستقل مرور شد'}});ok(r.status===200,`${stageKey} ${state}: ${JSON.stringify(r.data)}`);}
 async function artifact(kind,extra={}){const s=await call('/api/project-control/artifacts?project=cookie-case',{user:'producer'});const r=await call('/api/project-control/artifacts',{user:'producer',method:'POST',body:{projectSlug:'cookie-case',kind,revision:s.data.revision,artifactRevision:s.data.artifacts.find(a=>a.kind===kind)?.revision??0,...extra}});ok(r.status===201,'Create evidence '+kind);return r;}
 await step('intake','passed');const f=new FormData();for(const[k,v]of Object.entries({projectSlug:'cookie-case',title:'مدرک ساختگی نشست',category:'اسناد فنی',accessLevel:'project_team',extractedText:'مدرک کاملاً ساختگی برای آزمون نشست و گردش کار؛ سند ملک واقعی نیست.',extractionSourceKind:'manual_entry'}))f.set(k,v);f.set('file',new Blob(['isolated session flow'],{type:'text/plain'}),'fixture.txt');const doc=await call('/api/data-room/documents',{user:'producer',method:'POST',body:f});ok(doc.status===201,'Upload source with session');await step('data_room','active');
 ok((await call(`/api/data-room/documents/${doc.data.document.id}/review`,{user:'reviewer',method:'POST',body:{outcome:'approved',note:'منبع ساختگی توسط حساب دیگر مرور شد',revision:1}})).status===200,'Second cookie account reviews source');await step('data_room','passed');
 const input={acquisitionCost:1000,renovationCost:100,otherCost:100,debt:200,debtAnnualRate:12,expectedExitValue:1600,monthlyRent:10,monthlyExpenses:2,vacancyPercent:10,sellingFeePercent:5,durationMonths:12,investorAmount:100};const run=await call('/api/analysis',{user:'producer',method:'POST',body:{projectSlug:'cookie-case',input,name:'مرجع نشست'}});ok(run.status===201,'Receive financial output');await artifact('investment_plan',{runId:run.data.run.id});await step('investment_plan','active');await step('investment_plan','passed');
 ok((await call('/api/sample-reports',{user:'producer',method:'POST',body:{projectSlug:'cookie-case'}})).status===201,'Generate evidence-based sample');await step('sample_report','active');await step('sample_report','passed');await artifact('value_bridge',{input:{assetValue:1000,liabilities:100,reserves:100,unitCount:10,basisNote:'مبنای دستی ساختگی برای آزمون نشست'}});await step('value_bridge','active');await step('value_bridge','passed');await step('independent_review','active');await step('independent_review','passed','reviewer');await step('closed_pilot_register','active');await step('closed_pilot_register','passed');await call('/api/pilot/records',{user:'producer',method:'POST',body:{projectSlug:'cookie-case',kind:'review',note:'سناریوی نشست؛ بدون سفارش یا تخصیص'}});await step('scenario_log','active');await step('scenario_log','passed');await artifact('financial_report');await step('financial_report','active');await step('financial_report','passed');
 const report=await call('/api/project-control/report?project=cookie-case',{user:'investor'});ok(report.status===200&&report.data.includes('مطابق شواهد'),'Member reads approved Persian report');
 const metric=await call('/api/wealth/metrics?project=cookie-case',{user:'investor'});ok(metric.data.metrics[0].rates.base===38,'Member wealth uses published plan');
 ok((await call('/api/project-control/history?project=cookie-case',{user:'investor'})).status===403,'Member cannot read team history');

 ok((await call('/api/admin/readiness',{user:'none'})).status===403,'Readiness requires admin');
 ok((await call('/api/admin/readiness',{user:'investor'})).status===403,'Member cannot inspect readiness');
 const readiness=await call('/api/admin/readiness');ok(readiness.data.checks.every(c=>c.latest===null),'No evidence fabricated');
 ok((await call('/api/admin/readiness',{method:'POST',body:{checkKey:'browser',status:'recorded',evidenceRef:'test-only',note:'شاهد ساختگی برای آزمون دفتر آمادگی؛ تأیید واقعی نیست'}})).status===201,'Admin records evidence');
 const recorded=await call('/api/admin/readiness');ok(recorded.data.history.length===1&&recorded.data.checks[0].latest.evidenceRef==='test-only','Evidence persists with provenance');
 let immutable=false;try{await db.prepare("UPDATE operational_evidence SET note='changed'").run();}catch{immutable=true;}ok(immutable,'Evidence history cannot be rewritten');
 const nextPassword='a distinct test-only replacement 2026';
 ok((await call('/api/auth/password',{user:'producer',method:'POST',body:{currentPassword:'wrong',newPassword:nextPassword}})).status===401,'Password change verifies current credential');
 ok((await call('/api/auth/password',{user:'producer',method:'POST',body:{currentPassword:password,newPassword:nextPassword}})).status===200,'Account changes own password');
 ok((await call('/api/projects',{user:'producer'})).status===401,'Password change revokes old session');
 await login('producer','producer@example.test',nextPassword);
 ok((await call('/api/admin/local-accounts/security',{user:'producer',method:'POST',body:{userId:ids.reviewer,action:'recovery'}})).status===403,'User cannot reset another account');
 const recovery=await call('/api/admin/local-accounts/security',{method:'POST',body:{userId:ids.producer,action:'recovery'}});
 ok(recovery.status===200&&/^[a-f0-9]{64}$/.test(recovery.data.token),'Admin issues short-lived recovery');
 ok((await call('/api/projects',{user:'producer'})).status===401,'Recovery issuance closes old sessions');
 const redeemed=await call('/api/auth/password',{user:'none',method:'PUT',body:{token:recovery.data.token,newPassword:password}});ok(redeemed.status===200,'Valid recovery redeems');
 ok((await call('/api/auth/password',{user:'none',method:'PUT',body:{token:recovery.data.token,newPassword:nextPassword}})).status===400,'Recovery is single use');
 await login('producer','producer@example.test');
 const raceRecovery=await call('/api/admin/local-accounts/security',{method:'POST',body:{userId:ids.producer,action:'recovery'}});
 const race=await Promise.all([1,2].map(()=>call('/api/auth/password',{user:'none',method:'PUT',body:{token:raceRecovery.data.token,newPassword:nextPassword}})));
 ok(race.filter(r=>r.status===200).length===1&&race.filter(r=>r.status===400).length===1,'Exactly one concurrent redemption succeeds');
 const expired=await call('/api/admin/local-accounts/security',{method:'POST',body:{userId:ids.producer,action:'recovery'}});await db.prepare('UPDATE local_recovery_tokens SET expires_at=0').run();
 ok((await call('/api/auth/password',{user:'none',method:'PUT',body:{token:expired.data.token,newPassword:password}})).status===400,'Expired recovery denied');
 ok((await call('/api/admin/local-accounts/security',{method:'POST',body:{userId:ids.investor,action:'revoke_sessions'}})).status===200,'Admin revokes sessions');
 ok((await call('/api/projects',{user:'investor'})).status===401,'Revoked member cookie rejected');
 await login('investor','investor@example.test');
 ok((await call('/api/admin/local-accounts/security',{method:'POST',body:{userId:ids.investor,action:'deactivate'}})).status===200,'Admin deactivates local account');
 ok((await call('/api/auth/session',{user:'none',method:'POST',body:{email:'investor@example.test',password}})).status===401,'Inactive account cannot log in');
 const logs=await db.prepare("SELECT payload_json FROM audit_events WHERE action LIKE 'local_account.%'").all();ok(logs.results.every(r=>!r.payload_json.includes(recovery.data.token)&&!r.payload_json.includes(password)),'Audit contains no recovery codes or passwords');
 ok((await call('/api/auth/session',{method:'DELETE'})).status===200,'Logout removes session');ok((await call('/api/projects')).status===401,'Logged-out cookie cannot be reused');
 for(let i=0;i<10;i++)await call('/api/auth/session',{user:'none',method:'POST',body:{email:'bad@example.test',password:'wrong'}});ok((await call('/api/auth/session',{user:'none',method:'POST',body:{email:'bad@example.test',password:'wrong'}})).status===429,'Anonymous login limit persists');
 console.log(JSON.stringify({passed,failed:0,actualPasswordAndCookieFlow:true,identityHeadersUsed:false,productionDataTouched:false}));
}finally{await mf.dispose();}
