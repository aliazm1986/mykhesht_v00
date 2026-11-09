import { desc, eq, inArray } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { getDb } from "@/db";
import { dataRoomDocuments, documentExtractions } from "@/db/schema";
import { caseWriteQueries, getProjectActor, canManageDataRoom, canManageStages, canReviewDocuments, canViewAccessLevel, getCurrentActor, getProjectCaseWithStages, logAuditEvent, projectFromSlug } from "@/lib/control";

export const dynamic = "force-dynamic";

const MAX_DOCUMENT_BYTES = 15 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 120_000;
const categories = ["خلاصه پروژه", "اسناد فنی", "اسناد حقوقی", "اسناد مالی", "گزارش پیشرفت", "ضمائم", "دیگر"] as const;
const accessLevels = ["project_team", "reviewer", "admin"] as const;

type RuntimeBindings = { BUCKET?: R2Bucket };
type Extraction = typeof documentExtractions.$inferSelect;

const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

function extractionSummary(extraction?: Extraction) {
  if (!extraction) return { state: "pending", sourceKind: "unread", characterCount: 0, pageCount: null, failureReason: null, updatedAt: null };
  const { textContent: _textContent, ...safeExtraction } = extraction;
  return safeExtraction;
}

function publicDocument(document: typeof dataRoomDocuments.$inferSelect, extraction?: Extraction) {
  const { storageKey: _storageKey, ...safeDocument } = document;
  return { ...safeDocument, extraction: extractionSummary(extraction) };
}

function hexDigest(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function compactText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function parsePageCount(value: FormDataEntryValue | null) {
  const count = typeof value === "string" ? Number(value) : NaN;
  return Number.isInteger(count) && count > 0 && count <= 500 ? count : null;
}

export async function GET(request: Request) {
  let actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به پایلوت لازم است." }, 401);
  const projectSlug = new URL(request.url).searchParams.get("project");
  if (!projectSlug || !await projectFromSlug(projectSlug)) return json({ error: "پرونده معتبر نیست." }, 400);
  actor=await getProjectActor(actor,projectSlug);
  if(!actor)return json({error:"پرونده در دسترس نیست."},404);
  if(request.method==="POST"&&!canManageDataRoom(actor.role))return json({error:"اجازهٔ بارگذاری ندارید."},403);
  const caseData = await getProjectCaseWithStages(projectSlug, actor);
  if (!caseData) return json({ error: "پرونده معتبر نیست." }, 400);
  const documents = await getDb().select().from(dataRoomDocuments)
    .where(eq(dataRoomDocuments.caseId, caseData.projectCase.id))
    .orderBy(desc(dataRoomDocuments.uploadedAt));
  const extractionRows=await getDb().select().from(documentExtractions).innerJoin(dataRoomDocuments,eq(documentExtractions.documentId,dataRoomDocuments.id)).where(eq(dataRoomDocuments.caseId,caseData.projectCase.id));
  const extractions=extractionRows.map(row=>row.document_extractions);
  const extractionByDocument = new Map(extractions.map((extraction) => [extraction.documentId, extraction]));
  return json({
    actor: { displayName: actor.displayName, role: actor.role },
    permissions: { canManageDataRoom: canManageDataRoom(actor.role), canReviewDocuments: canReviewDocuments(actor.role), canManageStages: canManageStages(actor.role) },
    projectCase: caseData.projectCase,
    stages: caseData.stages,
    documents: documents
      .filter((document) => canViewAccessLevel(actor.role, document.accessLevel))
      .map((document) => publicDocument(document, extractionByDocument.get(document.id))),
  });
}

export async function POST(request: Request) {
  let actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به پایلوت لازم است." }, 401);

  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "فرم بارگذاری معتبر نیست." }, 400); }
  const projectSlug = form.get("projectSlug");
  const title = form.get("title");
  const category = form.get("category");
  const accessLevel = form.get("accessLevel");
  const file = form.get("file");
  const extractedText = compactText(form.get("extractedText"));
  const extractionFailure = compactText(form.get("extractionFailure"));
  const requestedSourceKind = compactText(form.get("extractionSourceKind"));
  const pageCount = parsePageCount(form.get("extractionPageCount"));
  const evidenceSchema = z.array(z.object({ page: z.number().int().min(1).max(500), method: z.enum(["pdf_text", "ocr"]), confidence: z.number().min(0).max(100).optional() })).max(500);
  let evidence: z.infer<typeof evidenceSchema> = [];
  try { evidence = evidenceSchema.parse(JSON.parse(String(form.get("extractionEvidence") || "[]"))); } catch { return json({ error: "سابقهٔ استخراج معتبر نیست." }, 400); }
  if (typeof projectSlug !== "string" || !await projectFromSlug(projectSlug)) return json({ error: "پرونده معتبر نیست." }, 400);
  if (typeof title !== "string" || title.trim().length < 2 || title.trim().length > 160) return json({ error: "عنوان سند باید بین ۲ تا ۱۶۰ نویسه باشد." }, 400);
  if (typeof category !== "string" || !(categories as readonly string[]).includes(category)) return json({ error: "دسته‌بندی سند معتبر نیست." }, 400);
  if (typeof accessLevel !== "string" || !(accessLevels as readonly string[]).includes(accessLevel)) return json({ error: "سطح دسترسی معتبر نیست." }, 400);
  if (!file || typeof file === "string") return json({ error: "یک فایل برای بارگذاری انتخاب کنید." }, 400);
  if (file.size === 0 || file.size > MAX_DOCUMENT_BYTES) return json({ error: "حجم فایل باید بیشتر از صفر و حداکثر ۱۵ مگابایت باشد." }, 400);
  if (extractedText.length > MAX_EXTRACTED_CHARACTERS) return json({ error: "متن استخراج‌شده حداکثر می‌تواند ۱۲۰٬۰۰۰ نویسه باشد." }, 400);

  const bucket = (env as unknown as RuntimeBindings).BUCKET;
  if (!bucket) return json({ error: "فضای نگهداری فایل هنوز برای این نسخه در دسترس نیست." }, 503);
  actor=await getProjectActor(actor,projectSlug);
  if(!actor)return json({error:"پرونده در دسترس نیست."},404);
  if(request.method==="POST"&&!canManageDataRoom(actor.role))return json({error:"اجازهٔ بارگذاری ندارید."},403);
  const caseData = await getProjectCaseWithStages(projectSlug, actor);
  if (!caseData) return json({ error: "پرونده معتبر نیست." }, 400);

  if((await getDb().select({id:dataRoomDocuments.id}).from(dataRoomDocuments).where(eq(dataRoomDocuments.caseId,caseData.projectCase.id)).limit(200)).length>=200)return json({error:"سقف هر پرونده ۲۰۰ سند است؛ پرونده را تفکیک کنید."},413);
  const id = crypto.randomUUID();
  const now = Date.now();
  const fileBytes = await file.arrayBuffer();
  const checksumSha256 = hexDigest(await crypto.subtle.digest("SHA-256", fileBytes));
  const storageKey = `private-data-room/${caseData.projectCase.id}/${id}`;
  const mimeType = file.type || "application/octet-stream";
  const isPdf = mimeType === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isOcr = requestedSourceKind === "browser_ocr" && (isPdf || /^image\/(png|jpeg|webp)$/.test(mimeType));
  const extractionState = extractedText ? (isOcr ? "needs_review" : "complete") : extractionFailure ? "failed" : "pending";
  const sourceKind = extractedText ? (isOcr ? "browser_ocr" : requestedSourceKind === "browser_pdfjs" && isPdf ? "browser_pdfjs" : "manual_entry") : "unread";
  const document = {
    id,
    caseId: caseData.projectCase.id,
    projectSlug,
    title: title.trim(),
    category,
    originalFilename: file.name.slice(0, 180),
    storageKey,
    mimeType,
    sizeBytes: file.size,
    checksumSha256,
    accessLevel,
    extractionStatus: extractionState,
    revision:1,
    reviewStatus: "pending",
    uploadedBy: actor.userId,
    uploadedAt: now,
    reviewedBy: null,
    reviewedAt: null,
  };
  const extraction = {
    id: crypto.randomUUID(),
    documentId: id,
    state: extractionState,
    sourceKind,
    metadataJson: JSON.stringify({ version: 1, fileChecksum: checksumSha256, origin: "client_reported", pages: evidence }),
    textContent: extractedText || null,
    characterCount: extractedText.length,
    pageCount,
    failureReason: extractionState === "failed" ? extractionFailure.slice(0, 500) : null,
    createdBy: actor.userId,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await bucket.put(storageKey, fileBytes, {
      httpMetadata: { contentType: mimeType, contentDisposition: "attachment" },
      customMetadata: { originalFilename: file.name.slice(0, 180), checksumSha256, uploadedBy: actor.userId },
    });
    await getDb().batch([getDb().insert(dataRoomDocuments).values(document), getDb().insert(documentExtractions).values(extraction),...caseWriteQueries(caseData.projectCase.id,actor.userId,"data_room")]);
    return json({ document: publicDocument(document, extraction) }, 201);
  } catch (error) {
    await getDb().delete(documentExtractions).where(eq(documentExtractions.documentId, id)).catch(() => undefined);
    await getDb().delete(dataRoomDocuments).where(eq(dataRoomDocuments.id, id)).catch(() => undefined);
    await bucket.delete(storageKey).catch(() => undefined);
    console.error("Data room document upload failed", error);
    return json({ error: "بارگذاری سند کامل نشد؛ هیچ رکورد قابل‌استفاده‌ای ثبت نشده است." }, 500);
  }
}
