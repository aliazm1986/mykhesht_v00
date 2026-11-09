import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dataRoomDocuments, documentReviews, documentExtractions } from "@/db/schema";
import { caseWriteQueries, getProjectActor, canReviewDocuments, canViewAccessLevel, getCurrentActor, logAuditEvent } from "@/lib/control";

export const dynamic = "force-dynamic";

const outcomes = ["approved", "needs_revision", "rejected"] as const;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به پایلوت لازم است." }, 401);
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "درخواست معتبر نیست." }, 400); }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : null;
  if (!input || typeof input.outcome !== "string" || !(outcomes as readonly string[]).includes(input.outcome)) return json({ error: "نتیجهٔ بازبینی معتبر نیست." }, 400);
  if (typeof input.note !== "string" || input.note.trim().length < 2 || input.note.trim().length > 1000) return json({ error: "یادداشت بازبینی باید بین ۲ تا ۱۰۰۰ نویسه باشد." }, 400);
  const rows = await getDb().select().from(dataRoomDocuments).where(eq(dataRoomDocuments.id, id)).limit(1);
  const document = rows[0];
  actor=document?await getProjectActor(actor,document.projectSlug):null;
  if(!actor)return json({error:"سند در دسترس نیست."},404);
  if(!canReviewDocuments(actor.role))return json({error:"اجازهٔ بازبینی ندارید."},403);
  if (!document || !canViewAccessLevel(actor.role, document.accessLevel)) return json({ error: "سند پیدا نشد." }, 404);
  if(typeof input.revision!=="number"||input.revision!==document.revision)return json({error:"نسخهٔ سند تغییر کرده است؛ متن را دوباره مرور کنید."},409);
  const extraction=(await getDb().select().from(documentExtractions).where(eq(documentExtractions.documentId,id)).limit(1))[0];
  if(input.outcome==="approved"){
    if(extraction?.state!=="complete")return json({error:"ابتدا متن سند را کامل و تأیید کنید."},422);
    const m=extraction.metadataJson?JSON.parse(extraction.metadataJson):{};
    if([document.uploadedBy,extraction.createdBy,m.humanConfirmedBy,...(m.contributors??[])].includes(actor.userId))return json({error:"تأیید باید توسط فردی غیر از بارگذار و تنظیم‌کنندگان متن انجام شود."},409);
  }
  const now = Date.now();
  const match=and(eq(dataRoomDocuments.id,id),eq(dataRoomDocuments.revision,input.revision));
  const results=await getDb().batch([getDb().insert(documentReviews).select(getDb().select({id:sql<string>`${crypto.randomUUID()}`.as("id"),documentId:dataRoomDocuments.id,reviewerId:sql<string>`${actor.userId}`.as("reviewerId"),outcome:sql<string>`${input.outcome}`.as("outcome"),note:sql<string>`${input.note.trim()}`.as("note"),createdAt:sql<number>`${now}`.as("createdAt")}).from(dataRoomDocuments).where(match)),getDb().update(dataRoomDocuments).set({reviewStatus:input.outcome,reviewedBy:actor.userId,reviewedAt:now,revision:sql`${dataRoomDocuments.revision}+1`}).where(match).returning({id:dataRoomDocuments.id}),...caseWriteQueries(document.caseId,actor.userId,"data_room",true)]);
  if(!results[1].length)return json({error:"سند هم‌زمان تغییر کرده است؛ متن را دوباره مرور کنید."},409);
  return json({ reviewStatus: input.outcome, reviewedAt: now });
}
