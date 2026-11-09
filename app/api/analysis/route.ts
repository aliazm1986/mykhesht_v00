import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { financialRuns } from "@/db/schema";
import { getProjectActor, getCurrentActor, logAuditEvent,auditQuery, projectFromSlug } from "@/lib/control";
import { calculateFinancialScenarios, financialInputSchema } from "@/lib/pilot-domain";
export const dynamic="force-dynamic";
const json=(v:unknown,s=200)=>Response.json(v,{status:s,headers:{"cache-control":"no-store"}});
export async function GET(request:Request){
  const actor=await getCurrentActor();if(!actor)return json({error:"ورود لازم است."},401);
  const slug=new URL(request.url).searchParams.get("project");
  if(!slug || !await projectFromSlug(slug))return json({error:"پروژه معتبر نیست."},400);
  if(!await getProjectActor(actor,slug))return json({error:"پرونده در دسترس نیست."},404);
  const runs=await getDb().select().from(financialRuns).where(and(eq(financialRuns.ownerId,actor.userId),eq(financialRuns.projectSlug,slug))).orderBy(desc(financialRuns.createdAt)).limit(30);
  return json({runs:runs.map(r=>({...r,input:JSON.parse(r.inputJson),results:JSON.parse(r.resultJson)}))});
}
export async function POST(request:Request){
  const actor=await getCurrentActor();if(!actor)return json({error:"ورود لازم است."},401);
  const body=await request.json().catch(()=>null) as {projectSlug?:unknown;input?:unknown;name?:unknown}|null;
  if(typeof body?.projectSlug!=="string" || !await projectFromSlug(body.projectSlug))return json({error:"پروژه معتبر نیست."},400);
  if(!await getProjectActor(actor,body.projectSlug))return json({error:"پرونده در دسترس نیست."},404);
  const parsed=financialInputSchema.safeParse(body.input);
  if(!parsed.success)return json({error:parsed.error.issues[0]?.message??"ورودی معتبر نیست."},400);
  const results=calculateFinancialScenarios(parsed.data);
  const row={id:crypto.randomUUID(),ownerId:actor.userId,projectSlug:body.projectSlug,name:typeof body.name==="string"?body.name.trim().slice(0,120)||"سناریوی آزمایشی":"سناریوی آزمایشی",inputJson:JSON.stringify(parsed.data),resultJson:JSON.stringify(results),createdAt:Date.now()};
  await getDb().batch([getDb().insert(financialRuns).values(row),auditQuery({actorId:actor.userId,action:"analysis.saved",targetType:"financial_run",targetId:row.id,payload:{projectSlug:row.projectSlug}})]);
  return json({run:{...row,input:parsed.data,results}},201);
}
