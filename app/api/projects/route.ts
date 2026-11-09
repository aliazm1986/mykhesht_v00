import { and,eq,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { projectDefinitions,projectCases,projectMemberships } from "@/db/schema";
import { allowedProjectSlugs,caseWriteQueries,getProjectActor,getCurrentActor,logAuditEvent } from "@/lib/control";
import { getProjectBundle,listProjectDefinitions } from "@/lib/projects-server";
import { projectDefinitionSchema } from "@/lib/pilot-domain";
export const dynamic="force-dynamic";
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{"cache-control":"no-store"}});
export async function GET(){
 const a=await getCurrentActor();if(!a)return json({error:"ورود لازم است."},401);
 const allowed=await allowedProjectSlugs(a);
 return json({projects:(await listProjectDefinitions(a.role==="admin")).filter(p=>allowed===null||allowed.includes(p.definition.slug)),canManage:["admin","project_manager"].includes(a.role)});
}
export async function POST(request:Request){
 const actor=await getCurrentActor();if(!actor)return json({error:"ورود لازم است."},401);
 const body=await request.json().catch(()=>null) as {definition?:unknown;revision?:unknown;archived?:unknown}|null;
 const parsed=projectDefinitionSchema.safeParse(body?.definition);
 if(!parsed.success)return json({error:parsed.error.issues[0]?.message??"اطلاعات معتبر نیست."},400);
 const d=parsed.data,db=getDb(),existing=(await db.select().from(projectDefinitions).where(eq(projectDefinitions.slug,d.slug)).limit(1))[0];
 const scoped=await getProjectActor(actor,d.slug),catalogExists=!!await getProjectBundle(d.slug);
 if(existing||catalogExists?!scoped||!["admin","project_manager"].includes(scoped.role):!["admin","project_manager"].includes(actor.role))return json({error:"دسترسی مدیریت این پروژه ندارید."},403);
 const expected=body?.revision;
 if(typeof expected!=="number"||!Number.isInteger(expected)||expected!==(existing?.revision??0))return json({error:"نسخهٔ پرونده تغییر کرده است."},409);
 const now=Date.now(),revision=expected+1,archived=body?.archived===true?1:0;
 const c=(await db.select().from(projectCases).where(eq(projectCases.projectSlug,d.slug)).limit(1))[0];
 const tail=c?[db.update(projectCases).set({title:d.name}).where(and(eq(projectCases.id,c.id),sql`changes()>0`)),...caseWriteQueries(c.id,actor.userId,"intake",true)]:[];
 if(existing){
  const r=await db.batch([db.update(projectDefinitions).set({definitionJson:JSON.stringify(d),revision,archived,updatedBy:actor.userId,updatedAt:now}).where(and(eq(projectDefinitions.slug,d.slug),eq(projectDefinitions.revision,expected))).returning(),...tail]);
  if(!r[0].length)return json({error:"ویرایش هم‌زمان ثبت شد؛ اطلاعات را تازه کنید."},409);
 }else{
  const condition=and(eq(projectDefinitions.slug,d.slug),eq(projectDefinitions.updatedBy,actor.userId),eq(projectDefinitions.createdAt,now));
  const r=await db.batch([
   db.insert(projectDefinitions).values({slug:d.slug,definitionJson:JSON.stringify(d),revision,archived,updatedBy:actor.userId,createdAt:now,updatedAt:now}).onConflictDoNothing({target:projectDefinitions.slug}).returning(),...tail,
   db.insert(projectMemberships).select(db.select({id:sql<string>`${crypto.randomUUID()}`.as("id"),projectSlug:projectDefinitions.slug,userId:sql<string>`${actor.userId}`.as("userId"),role:sql<string>`'project_manager'`.as("role"),active:sql<number>`1`.as("active"),updatedBy:sql<string>`${actor.userId}`.as("updatedBy"),createdAt:sql<number>`${now}`.as("createdAt"),updatedAt:sql<number>`${now}`.as("updatedAt")}).from(projectDefinitions).where(condition)).onConflictDoNothing()]);
  if(!r[0].length)return json({error:"پرونده هم‌زمان ایجاد شده است؛ اطلاعات را تازه کنید."},409);
 }
 return json({project:{definition:d,revision,archived:!!archived}},existing?200:201);
}
