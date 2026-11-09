import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { logAuditEvent, auditQuery } from "@/lib/control";
const tables={operationalEvidence:schema.operationalEvidence,localAccounts:schema.localAccounts,recordVersions:schema.recordVersions,reviewRules:schema.reviewRules,projectMemberships:schema.projectMemberships,caseArtifacts:schema.caseArtifacts,pilotRecords:schema.pilotRecords,userProfiles:schema.userProfiles,projectCases:schema.projectCases,caseStageDecisions:schema.caseStageDecisions,dataRoomDocuments:schema.dataRoomDocuments,documentReviews:schema.documentReviews,documentExtractions:schema.documentExtractions,sampleReports:schema.sampleReports,wealthScenarios:schema.wealthScenarios,auditEvents:schema.auditEvents,projectDefinitions:schema.projectDefinitions,financialRuns:schema.financialRuns,memberDetails:schema.memberDetails,supportTickets:schema.supportTickets,ticketReplies:schema.ticketReplies,notifications:schema.notifications,userWallets:schema.userWallets,shareHoldings:schema.shareHoldings,marketOrders:schema.marketOrders,marketTrades:schema.marketTrades};
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{"cache-control":"no-store"}});
export async function createBackup(bucket:R2Bucket,actorId:string){
  const id=crypto.randomUUID(),now=Date.now();
  const data:Record<string,unknown[]>={};
  const entries=Object.entries(tables);
  const queries=entries.map(([,table])=>getDb().select().from(table).limit(20_001));
  const snapshot=await getDb().batch([queries[0],...queries.slice(1)]);
  entries.forEach(([name],index)=>{data[name]=snapshot[index];});
  if(Object.values(data).some(rows=>rows.length>20_000))return json({error:"حجم داده از سقف پشتیبان تعاملی بیشتر است؛ خروجی مدیریت‌شده لازم است."},413);
  const docs=data.dataRoomDocuments as Array<{id:string;storageKey:string;checksumSha256:string}>;
  const files:Array<{documentId:string;originalKey:string;backupKey:string;checksum:string}>=[];
  for(const doc of docs)files.push({documentId:doc.id,originalKey:doc.storageKey,backupKey:`private-backups/${id}/files/${doc.id}`,checksum:doc.checksumSha256});
  const text=JSON.stringify({format:"khesht-pilot-backup-v1",createdAt:now,tables:data,files},null,2);
  const bytes=new TextEncoder().encode(text);
  if(bytes.byteLength>25*1024*1024)return json({error:"پشتیبان داده بیشتر از ۲۵ مگابایت است؛ خروجی مدیریت‌شده لازم است."},413);
  const digest=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
  const checksum=await digest(bytes.buffer as ArrayBuffer),storageKey=`private-backups/${id}/manifest.json`;
  const written:string[]=[];
  try {
    for(const entry of files){
      const raw=await bucket.get(entry.originalKey);
      if(!raw)throw new Error("missing_source");
      const content=await raw.arrayBuffer();
      if(await digest(content)!==entry.checksum)throw new Error("source_checksum_mismatch");
      written.push(entry.backupKey);
      await bucket.put(entry.backupKey,content,{httpMetadata:raw.httpMetadata,customMetadata:{sha256:entry.checksum}});
    }
    written.push(storageKey);await bucket.put(storageKey,bytes,{httpMetadata:{contentType:"application/json"}});
    await getDb().batch([getDb().insert(schema.backupSnapshots).values({id,storageKey,checksum,sizeBytes:bytes.byteLength,createdBy:actorId,createdAt:now}),auditQuery({actorId,action:"backup.created",targetType:"backup",targetId:id,payload:{files:files.length,sizeBytes:bytes.byteLength,checksum}})]);
    return json({id,checksum,sizeBytes:bytes.byteLength,fileCount:files.length,createdAt:now},201);
  } catch {
    // Exact keys from this attempt only: existing backups are never removed.
    if(written.length)await bucket.delete(written);
    return json({error:"پشتیبان کامل نشد؛ کپی‌های نیمه‌تمام این تلاش پاک شدند."},409);
  }
}

export async function verifyBackup(bucket:R2Bucket,actorId:string,id:string){
  const row=(await getDb().select().from(schema.backupSnapshots).where(eq(schema.backupSnapshots.id,id)).limit(1))[0];
  if(!row)return json({error:"پشتیبان پیدا نشد."},404);
  const manifest=await bucket.get(row.storageKey);
  if(!manifest)return json({error:"فایل پشتیبان موجود نیست."},409);
  const bytes=await manifest.arrayBuffer();
  const digest=async(data:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",data)),b=>b.toString(16).padStart(2,"0")).join("");
  if(await digest(bytes)!==row.checksum)return json({error:"هش دادهٔ پشتیبان منطبق نیست."},409);
  const parsed=JSON.parse(new TextDecoder().decode(bytes)) as {files:Array<{backupKey:string;checksum:string}>};
  for(const file of parsed.files){
    const object=await bucket.get(file.backupKey);
    if(!object||await digest(await object.arrayBuffer())!==file.checksum)return json({error:"یکی از فایل‌های پشتیبان ناقص یا ناسازگار است."},409);
  }
  await logAuditEvent({actorId:actorId,action:"backup.verified",targetType:"backup",targetId:row.id});
  return json({verified:true,id:row.id,fileCount:parsed.files.length,checkedAt:Date.now()});
}
