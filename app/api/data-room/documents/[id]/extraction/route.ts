import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dataRoomDocuments, documentExtractions } from "@/db/schema";
import { caseWriteQueries, getProjectActor, canManageDataRoom, canReviewDocuments, canViewAccessLevel, getCurrentActor, logAuditEvent } from "@/lib/control";

export const dynamic = "force-dynamic";

const MAX_EXTRACTED_CHARACTERS = 120_000;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

async function getAllowedDocument(id: string) {
  let actor = await getCurrentActor();
  if (!actor) return { error: json({ error: "ورود به پایلوت لازم است." }, 401) };
  const document = (await getDb().select().from(dataRoomDocuments).where(eq(dataRoomDocuments.id, id)).limit(1))[0];
  actor=document?await getProjectActor(actor,document.projectSlug):null;
  if(!actor)return{error:json({error:"سند در دسترس نیست."},404)};
  if(!canManageDataRoom(actor.role)&&!canReviewDocuments(actor.role))return{error:json({error:"اجازهٔ اصلاح متن ندارید."},403)};
  if (!document || !canViewAccessLevel(actor.role, document.accessLevel)) return { error: json({ error: "سند در دسترس نیست." }, 404) };
  return { actor, document };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await getAllowedDocument(id);
  if ("error" in allowed) return allowed.error;
  const extraction = (await getDb().select().from(documentExtractions).where(eq(documentExtractions.documentId, allowed.document.id)).limit(1))[0];
  if (!extraction) return json({ documentRevision:allowed.document.revision,state: "pending", textContent: null, characterCount: 0, pageCount: null, failureReason: null, sourceKind: "unread" });
  return json({
    documentRevision:allowed.document.revision,
    state: extraction.state,
    sourceKind: extraction.sourceKind,
    textContent: extraction.textContent,
    characterCount: extraction.characterCount,
    pageCount: extraction.pageCount,
    failureReason: extraction.failureReason,
    updatedAt: extraction.updatedAt,
    metadata: extraction.metadataJson ? JSON.parse(extraction.metadataJson) : null,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const allowed = await getAllowedDocument(id);
  if ("error" in allowed) return allowed.error;
  const body = await request.json().catch(() => null) as { textContent?: unknown; pageCount?: unknown; confirmOcr?: unknown; revision?:unknown } | null;
  if(typeof body?.revision!=="number"||body.revision!==allowed.document.revision)return json({error:"نسخهٔ سند تغییر کرده است؛ متن را دوباره دریافت کنید."},409);
  const prior = (await getDb().select().from(documentExtractions).where(eq(documentExtractions.documentId, allowed.document.id)).limit(1))[0];
  const confirmOcr = body?.confirmOcr === true;
  if (confirmOcr && !["browser_ocr", "ocr_human_confirmed"].includes(prior?.sourceKind ?? "")) return json({ error: "متن OCR برای تأیید وجود ندارد." }, 409);
  const textContent = typeof body?.textContent === "string" ? body.textContent.replace(/\s+/g, " ").trim() : "";
  const pageCountValue = typeof body?.pageCount === "number" ? body.pageCount : Number(body?.pageCount);
  const pageCount = Number.isInteger(pageCountValue) && pageCountValue > 0 && pageCountValue <= 500 ? pageCountValue : null;
  if (!textContent) return json({ error: "برای ثبت، متن خوانده‌شده را وارد کنید." }, 400);
  if (textContent.length > MAX_EXTRACTED_CHARACTERS) return json({ error: "متن خوانده‌شده حداکثر می‌تواند ۱۲۰٬۰۰۰ نویسه باشد." }, 400);

  const now = Date.now();
  const extraction = {
    id: crypto.randomUUID(),
    documentId: allowed.document.id,
    state: "complete",
    sourceKind: confirmOcr ? "ocr_human_confirmed" : "manual_entry",
    metadataJson: JSON.stringify({ ...(prior?.metadataJson ? JSON.parse(prior.metadataJson) : {}),contributors:[...new Set([...(prior?.metadataJson?JSON.parse(prior.metadataJson).contributors??[]:[]),prior?.createdBy,allowed.actor.userId].filter(Boolean))],humanConfirmedBy:allowed.actor.userId,humanConfirmedAt:now }),
    textContent,
    characterCount: textContent.length,
    pageCount: pageCount ?? prior?.pageCount ?? null,
    failureReason: null,
    createdBy: allowed.actor.userId,
    createdAt: now,
    updatedAt: now,
  };
  const match=and(eq(dataRoomDocuments.id,allowed.document.id),eq(dataRoomDocuments.revision,body.revision));
  const results=await getDb().batch([getDb().insert(documentExtractions).select(getDb().select({
    id:sql<string>`${extraction.id}`.as("id"),documentId:dataRoomDocuments.id,state:sql<string>`${extraction.state}`.as("state"),sourceKind:sql<string>`${extraction.sourceKind}`.as("sourceKind"),metadataJson:sql<string>`${extraction.metadataJson}`.as("metadataJson"),textContent:sql<string>`${textContent}`.as("textContent"),characterCount:sql<number>`${textContent.length}`.as("characterCount"),pageCount:sql<number|null>`${extraction.pageCount}`.as("pageCount"),failureReason:sql<string|null>`NULL`.as("failureReason"),createdBy:sql<string>`${allowed.actor.userId}`.as("createdBy"),createdAt:sql<number>`${now}`.as("createdAt"),updatedAt:sql<number>`${now}`.as("updatedAt")
  }).from(dataRoomDocuments).where(match)).onConflictDoUpdate({
    target: documentExtractions.documentId,
    set: { createdBy:allowed.actor.userId, state: extraction.state, sourceKind: extraction.sourceKind, metadataJson: extraction.metadataJson, textContent: extraction.textContent, characterCount: extraction.characterCount, pageCount: extraction.pageCount, failureReason: null, updatedAt: now },
  }), getDb().update(dataRoomDocuments).set({ extractionStatus: "complete", reviewStatus: "pending", reviewedBy:null,reviewedAt:null,revision:sql`${dataRoomDocuments.revision}+1` }).where(match).returning({id:dataRoomDocuments.id}) ,...caseWriteQueries(allowed.document.caseId,allowed.actor.userId,"data_room",true)]);
  if(!results[1].length)return json({error:"تغییر هم‌زمان سند؛ متن را تازه کنید."},409);
  return json({ state: "complete", sourceKind: extraction.sourceKind, characterCount: textContent.length, pageCount: extraction.pageCount, updatedAt: now });
}
