import { asc, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { notifications, supportTickets, ticketReplies } from "@/db/schema";
import { getCurrentActor, logAuditEvent } from "@/lib/control";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>Response.json({ok:true,data},{status,headers:{"cache-control":"no-store"}});
const fail=(error:string,status:number)=>Response.json({ok:false,error},{status,headers:{"cache-control":"no-store"}});
const date=(n:number)=>new Intl.DateTimeFormat("fa-IR",{dateStyle:"medium",timeStyle:"short"}).format(n);
export async function GET(){
  const actor=await getCurrentActor();if(!actor)return fail("ورود لازم است.",401);
  const db=getDb();
  const query=db.select().from(supportTickets);
  const tickets=actor.role==="admin"?await query.orderBy(desc(supportTickets.updatedAt)).limit(200):await query.where(eq(supportTickets.ownerId,actor.userId)).orderBy(desc(supportTickets.updatedAt)).limit(100);
  const replies=tickets.length?await db.select().from(ticketReplies).where(inArray(ticketReplies.ticketId,tickets.map(t=>t.id))).orderBy(asc(ticketReplies.createdAt)):[];
  return json(tickets.map(t=>({...t,createdAt:date(t.createdAt),replies:replies.filter(r=>r.ticketId===t.id).map(r=>({...r,author:r.authorName,createdAt:date(r.createdAt)}))})));
}
export async function POST(request:Request){
  const actor=await getCurrentActor();if(!actor)return fail("ورود لازم است.",401);
  const body=await request.json().catch(()=>null) as {subject?:unknown;message?:unknown;category?:unknown}|null;
  if(typeof body?.subject!=="string"||body.subject.trim().length<2||body.subject.length>160||typeof body.message!=="string"||body.message.trim().length<2||body.message.length>6000||typeof body.category!=="string"||!["مالی","حقوقی","فنی","احراز هویت","پروژه‌ها"].includes(body.category))return fail("موضوع، دسته و شرح درخواست را معتبر وارد کنید.",400);
  const now=Date.now();
  const ticket={id:crypto.randomUUID(),ownerId:actor.userId,subject:body.subject.trim(),category:body.category,message:body.message.trim(),status:"open",createdAt:now,updatedAt:now};
  await getDb().insert(supportTickets).values(ticket);
  await logAuditEvent({actorId:actor.userId,action:"support.ticket_created",targetType:"ticket",targetId:ticket.id});
  return json({...ticket,createdAt:date(now),replies:[]},201);
}
export async function PUT(request:Request){
  const actor=await getCurrentActor();if(!actor)return fail("ورود لازم است.",401);
  const body=await request.json().catch(()=>null) as {id?:unknown;message?:unknown;close?:unknown}|null;
  if(typeof body?.id!=="string")return fail("شناسه معتبر نیست.",400);
  const ticket=(await getDb().select().from(supportTickets).where(eq(supportTickets.id,body.id)).limit(1))[0];
  if(!ticket || (actor.role!=="admin"&&ticket.ownerId!==actor.userId))return fail("تیکت در دسترس نیست.",404);
  if(typeof body.message!=="string"||body.message.trim().length<2||body.message.length>6000)return fail("متن پاسخ باید بین ۲ تا ۶۰۰۰ نویسه باشد.",400);
  const now=Date.now();
  const reply={id:crypto.randomUUID(),ticketId:ticket.id,authorId:actor.userId,authorName:actor.displayName,message:body.message.trim(),createdAt:now};
  await getDb().batch([
    getDb().insert(ticketReplies).values(reply),
    getDb().update(supportTickets).set({status:body.close===true&&actor.role==="admin"?"closed":actor.role==="admin"?"answered":"open",updatedAt:now}).where(eq(supportTickets.id,ticket.id)),
    getDb().insert(notifications).values({id:crypto.randomUUID(),ownerId:ticket.ownerId,title:"پاسخ تیکت",body:ticket.subject,href:"/support",readAt:null,createdAt:now}),
  ]);
  await logAuditEvent({actorId:actor.userId,action:"support.reply_added",targetType:"ticket",targetId:ticket.id});
  return json({...reply,author:reply.authorName,createdAt:date(now)});
}
