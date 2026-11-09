import { getCurrentActor,auditQuery } from '@/lib/control';
import { localAuthEnabled,passwordHash,authSettings } from '@/lib/local-auth';
import { getDb } from '@/db';
import { localAccounts,userProfiles } from '@/db/schema';
import { z } from 'zod';
export async function POST(request:Request){
 if(!localAuthEnabled())return Response.json({error:'ورود مستقل فعال نیست.'},{status:404});const actor=await getCurrentActor();if(actor?.role!=='admin')return Response.json({error:'دسترسی مدیر لازم است.'},{status:403});
 const p=z.object({email:z.string().email().max(254),password:z.string().min(16).max(128)}).safeParse(await request.json().catch(()=>null));if(!p.success)return Response.json({error:'ایمیل و گذرواژهٔ حداقل ۱۶ نویسه‌ای لازم است.'},{status:400});
 const now=Date.now(),id=crypto.randomUUID(),email=p.data.email.toLowerCase();
 if(email===authSettings().KHESHT_LOCAL_OWNER_EMAIL?.toLowerCase())return Response.json({error:'حساب مالک از قبل پیکربندی شده است.'},{status:409});
 try{await getDb().batch([getDb().insert(localAccounts).values({userId:id,email,passwordHash:await passwordHash(p.data.password),active:1,createdAt:now}),getDb().insert(userProfiles).values({userId:id,email,displayName:email,role:'viewer',createdAt:now,updatedAt:now}),auditQuery({actorId:actor.userId,action:'local_account.created',targetType:'user',targetId:id})]);}catch{return Response.json({error:'حساب ساخته نشد؛ ایمیل تکراری یا پایگاه در دسترس نیست.'},{status:409});}
 return Response.json({id,email},{status:201,headers:{'cache-control':'no-store'}});
}
