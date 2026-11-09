import { eq,sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { projectCases,projectMemberships,userProfiles } from '@/db/schema';
import { getCurrentActor,logAuditEvent,projectFromSlug,projectRoles } from '@/lib/control';
export const dynamic='force-dynamic';
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{'cache-control':'no-store'}});
export async function GET(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:'ورود لازم است.'},401);
 if(actor.role!=='admin')return json({error:'فقط مدیر سامانه مجاز است.'},403);
 const slug=new URL(request.url).searchParams.get('project');if(!slug||!await projectFromSlug(slug))return json({error:'پرونده معتبر نیست.'},404);
 const[members,users]=await Promise.all([getDb().select().from(projectMemberships).where(eq(projectMemberships.projectSlug,slug)),getDb().select({userId:userProfiles.userId,displayName:userProfiles.displayName,email:userProfiles.email}).from(userProfiles)]);
 return json({members,users,roles:projectRoles});
}
export async function PUT(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:'ورود لازم است.'},401);
 if(actor.role!=='admin')return json({error:'فقط مدیر سامانه مجاز است.'},403);
 const parsed=z.object({projectSlug:z.string().max(120),userId:z.string().max(160),role:z.enum(projectRoles),active:z.boolean()}).safeParse(await request.json().catch(()=>null));
 if(!parsed.success)return json({error:'عضویت معتبر نیست.'},400);const b=parsed.data;
 if(!await projectFromSlug(b.projectSlug))return json({error:'پرونده معتبر نیست.'},404);
 if(!(await getDb().select().from(userProfiles).where(eq(userProfiles.userId,b.userId)).limit(1)).length)return json({error:'کاربر باید قبلاً به سایت وارد شده باشد.'},400);
 const now=Date.now(),row={id:crypto.randomUUID(),projectSlug:b.projectSlug,userId:b.userId,role:b.role,active:b.active?1:0,updatedBy:actor.userId,createdAt:now,updatedAt:now};
 await getDb().batch([getDb().insert(projectMemberships).values(row).onConflictDoUpdate({target:[projectMemberships.projectSlug,projectMemberships.userId],set:{role:row.role,active:row.active,updatedBy:actor.userId,updatedAt:now}}),getDb().update(projectCases).set({revision:sql`${projectCases.revision}+1`,updatedAt:now}).where(eq(projectCases.projectSlug,b.projectSlug))]);
 return json({saved:true});
}
