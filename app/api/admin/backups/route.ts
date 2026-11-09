import {retentionPlan,removeExpiredBackup} from "@/lib/backup-retention";
import {logAuditEvent} from "@/lib/control";
import { createBackup, verifyBackup } from "@/lib/backup-operations";
import { backupArchive } from '@/lib/backup-export';
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import * as schema from "@/db/schema";
import { getCurrentActor } from "@/lib/control";
export const dynamic="force-dynamic";
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{"cache-control":"no-store"}});
async function authorize(){
  const actor=await getCurrentActor();
  if(!actor)return {error:json({error:"ورود لازم است."},401)};
  if(actor.role!=="admin")return {error:json({error:"فقط مدیر اجازهٔ پشتیبان‌گیری دارد."},403)};
  const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;
  if(!bucket)return {error:json({error:"فضای خصوصی در دسترس نیست."},503)};
  return {actor,bucket};
}
export async function GET(request:Request){
  const allowed=await authorize();if("error"in allowed)return allowed.error;
  if(new URL(request.url).searchParams.has("retention"))return json(await retentionPlan());
  const id=new URL(request.url).searchParams.get("id");if(!id)return json({error:"شناسه لازم است."},400);
  const row=(await getDb().select().from(schema.backupSnapshots).where(eq(schema.backupSnapshots.id,id)).limit(1))[0];
  if(!row)return json({error:"نسخه پیدا نشد."},404);
  const file=await allowed.bucket.get(row.storageKey);if(!file)return json({error:"فایل پشتیبان در دسترس نیست."},404);
  if(new URL(request.url).searchParams.get('format')==='tar'){
    const bytes=new Uint8Array(await file.arrayBuffer());
    const checksum=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
    if(checksum!==row.checksum)return json({error:'هش پشتیبان منطبق نیست.'},409);
    const manifest=JSON.parse(new TextDecoder().decode(bytes));
    await logAuditEvent({actorId:allowed.actor.userId,action:'backup.export_requested',targetType:'backup',targetId:row.id});
    return new Response(backupArchive(allowed.bucket,bytes,manifest.files,row.createdAt),{headers:{'content-type':'application/x-tar','content-disposition':`attachment; filename="khesht-backup-${row.id}.tar"`,'cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
  const documentId=new URL(request.url).searchParams.get("document");
  if(documentId){
    const manifest=await file.json() as {files:Array<{documentId:string;backupKey:string}>};
    const entry=manifest.files.find(f=>f.documentId===documentId);
    if(!entry)return json({error:"فایل در پشتیبان نیست."},404);
    const raw=await allowed.bucket.get(entry.backupKey);if(!raw)return json({error:"فایل پشتیبان موجود نیست."},404);
    return new Response(raw.body,{headers:{"content-type":"application/octet-stream","content-disposition":`attachment; filename="${documentId}.bin"`,"cache-control":"no-store","x-content-type-options":"nosniff"}});
  }
  return new Response(file.body,{headers:{"content-type":"application/json; charset=utf-8","content-disposition":`attachment; filename="khesht-backup-${id}.json"`,"cache-control":"no-store","x-content-type-options":"nosniff"}});
}
export async function POST(){const allowed=await authorize();if("error"in allowed)return allowed.error;return createBackup(allowed.bucket,allowed.actor.userId);}
export async function PUT(request:Request){const allowed=await authorize();if("error"in allowed)return allowed.error;const body=await request.json().catch(()=>null) as {id?:unknown}|null;if(typeof body?.id!=="string")return json({error:"شناسه معتبر نیست."},400);return verifyBackup(allowed.bucket,allowed.actor.userId,body.id);}

export async function DELETE(request:Request){const a=await authorize();if("error"in a)return a.error;const b=await request.json().catch(()=>null) as {id?:unknown;confirm?:unknown}|null;if(typeof b?.id!=="string"||b.confirm!=="delete_expired_backup")return json({error:"شناسه و تأیید صریح حذف این نسخه لازم است."},400);if(!await removeExpiredBackup(a.bucket,b.id))return json({error:"این نسخه در برنامهٔ حذف نیست؛ سه نسخهٔ تازه و نسخه‌های کمتر از ۳۰ روز حفظ می‌شوند."},409);await logAuditEvent({actorId:a.actor.userId,action:"backup.expired_deleted",targetType:"backup",targetId:b.id});return json({deleted:true});}
