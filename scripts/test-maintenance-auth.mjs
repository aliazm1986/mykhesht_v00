import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {createHmac,randomBytes} from 'node:crypto';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const key='isolated-test-service-signing-key-2026';
const bundle=await build({entryPoints:['tests/backend-worker.ts'],bundle:true,write:false,format:'esm',platform:'neutral',target:'es2022',external:['cloudflare:workers','node:*'],alias:{'next/headers':path.resolve('tests/request-context.ts'),'next/navigation':path.resolve('tests/request-context.ts')},logLevel:'error'});
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{KHESHT_BOOTSTRAP_ADMIN_USER_ID:'owner-test',KHESHT_MAINTENANCE_MODE:'signed-service',KHESHT_MAINTENANCE_HOST:'khesht.test',KHESHT_MAINTENANCE_SIGNING_KEY:key}}));
let passed=0;const ok=(x,m)=>{assert.ok(x,m);passed++;};
const url='https://khesht.test/api/internal/maintenance';
function signed(method='GET',timestamp=Date.now().toString()){const nonce=randomBytes(16).toString('hex'),message=`${method}\nkhesht.test\n/api/internal/maintenance\n${timestamp}\n${nonce}`;return {'x-khesht-timestamp':timestamp,'x-khesht-nonce':nonce,'x-khesht-signature':createHmac('sha256',key).update(message).digest('hex')};}
try{
 const db=await mf.getD1Database('DB');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())for(const s of(await readFile(path.join('drizzle',f),'utf8')).split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(s).run();
 ok((await mf.dispatchFetch(url)).status===401,'Unsigned service denied');
 ok((await mf.dispatchFetch(url,{headers:signed('GET','1000000000000')})).status===401,'Expired signature denied');
 ok((await mf.dispatchFetch(url,{method:'POST',headers:signed('GET')})).status===401,'Method is signed');
 ok((await mf.dispatchFetch(url+'?altered=1',{headers:signed()})).status===401,'Query is signed');
 const headers=signed();ok((await mf.dispatchFetch(url,{headers})).status===200,'Valid service signature accepted');
 ok((await mf.dispatchFetch(url,{headers})).status===409,'Replay denied');
 ok((await mf.dispatchFetch(url,{headers:{...signed(),'oai-authenticated-user-id':'viewer','oai-authenticated-user-email':'viewer@example.test'}})).status===403,'Visitor cannot borrow service credentials');
 const written=await mf.dispatchFetch(url,{method:'POST',headers:signed('POST')});const result=await written.json();ok(written.status===201&&result.result.verified===true,'Signed service creates verified backup');
 const read=await mf.dispatchFetch(url,{headers:signed()});ok((await read.json()).runs[0].backup_id===result.result.backupId,'Signed read confirms persisted run');
 ok((await mf.dispatchFetch(url,{headers:{'oai-authenticated-user-id':'owner-test','oai-authenticated-user-email':'owner@example.test'}})).status===200,'Owner admin retains access');
 console.log(JSON.stringify({passed,failed:0,signedService:true,productionDataTouched:false}));
}finally{await mf.dispose();}
