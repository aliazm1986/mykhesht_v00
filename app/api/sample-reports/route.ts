import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dataRoomDocuments, documentExtractions, financialRuns, sampleReports } from "@/db/schema";
import { getProjectBundle } from "@/lib/projects-server";
import { caseWriteQueries,getProjectActor,canReviewDocuments, canViewAccessLevel, getCurrentActor, getProjectCaseWithStages, logAuditEvent,auditQuery, projectFromSlug } from "@/lib/control";

import { artifactOf,dossierFingerprint,getCaseEvidence } from "@/lib/case-workflow";
export const dynamic = "force-dynamic";

const MAX_SCOPE_NOTE = 1_400;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "no-store" } });

type ReportContent = {
  version: "pilot-draft-v1";
  fingerprint?:string;
  generatedAt: number;
  evidence: Array<{ documentId: string; title: string; category: string; sourceKind: string; characterCount: number; pageCount: number | null; reviewStatus: string; excerpt: string }>;
  controls: Array<{ title: string; detail: string }>;
  limitations: string[];
  conclusion: string;
  projectSummary?: { description: string; location: string; outcome: string; horizonMonths: number; risks: Array<{title:string;trigger:string;response:string}> };
  financialScenario?: { id:string;name:string;input:unknown;results:unknown;createdAt:number } | null;
};

function compact(value: string, max: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > max ? `${normalized.slice(0, max).trimEnd()}…` : normalized;
}

function parseContent(value: string): ReportContent | null {
  try { return JSON.parse(value) as ReportContent; } catch { return null; }
}

function sourceIds(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch { return []; }
}

function publicReport(report: typeof sampleReports.$inferSelect) {
  return {
    id: report.id,
    projectSlug: report.projectSlug,
    title: report.title,
    status: report.status,
    scopeNote: report.scopeNote,
    sourceDocumentIds: sourceIds(report.sourceDocumentIdsJson),
    content: parseContent(report.contentJson),
    generatedAt: report.generatedAt,
  };
}

async function getReportContext(request: Request) {
  let actor = await getCurrentActor();
  if (!actor) return { error: json({ error: "ورود به پایلوت لازم است." }, 401) };
  const projectSlug = new URL(request.url).searchParams.get("project");
  if (!projectSlug || !await projectFromSlug(projectSlug)) return { error: json({ error: "پرونده معتبر نیست." }, 400) };
  actor=await getProjectActor(actor,projectSlug);
  if(!actor)return{error:json({error:"پرونده در دسترس نیست."},404)};
  if(!canReviewDocuments(actor.role)&&actor.role!=="project_manager")return{error:json({error:"اجازهٔ گزارش ندارید."},403)};
  const caseData = await getProjectCaseWithStages(projectSlug, actor);
  if (!caseData) return { error: json({ error: "پرونده معتبر نیست." }, 400) };
  return { actor, projectSlug, caseData };
}

export async function GET(request: Request) {
  const context = await getReportContext(request);
  if ("error" in context) return context.error;
  const reports = await getDb().select().from(sampleReports)
    .where(eq(sampleReports.caseId, context.caseData.projectCase.id))
    .orderBy(desc(sampleReports.generatedAt));
  const sources = await getDb().select({
    id: dataRoomDocuments.id,
    title: dataRoomDocuments.title,
    category: dataRoomDocuments.category,
    accessLevel: dataRoomDocuments.accessLevel,
    reviewStatus: dataRoomDocuments.reviewStatus,
    sourceKind: documentExtractions.sourceKind,
    characterCount: documentExtractions.characterCount,
    pageCount: documentExtractions.pageCount,
  }).from(dataRoomDocuments)
    .innerJoin(documentExtractions, eq(documentExtractions.documentId, dataRoomDocuments.id))
    .where(and(eq(dataRoomDocuments.caseId, context.caseData.projectCase.id), eq(documentExtractions.state, "complete")))
    .orderBy(desc(documentExtractions.updatedAt));
  const visibleSources = sources.filter((source) => canViewAccessLevel(context.actor.role, source.accessLevel));
  const visibleSourceIds = new Set(visibleSources.map((source) => source.id));
  const evidence=await getCaseEvidence(context.caseData.projectCase.id,context.projectSlug);
  const visibleReports=[];
  for(const r of reports.filter(r=>sourceIds(r.sourceDocumentIdsJson).every(id=>visibleSourceIds.has(id))))visibleReports.push({...publicReport(r),isCurrent:parseContent(r.contentJson)?.fingerprint===await dossierFingerprint(evidence,sourceIds(r.sourceDocumentIdsJson))});
  const download = new URL(request.url).searchParams.get("download");
  if (download) {
    const report = visibleReports.find(r => r.id === download);
    if (!report) return json({error:"گزارش در دسترس نیست."},404);
    return new Response(JSON.stringify(report,null,2),{headers:{"content-type":"application/json; charset=utf-8","content-disposition":`attachment; filename="khesht-report-${report.id}.json"`,"cache-control":"no-store"}});
  }
  return json({
    permissions: { canGenerate: canReviewDocuments(context.actor.role)||context.actor.role==='project_manager' },
    sources: visibleSources.filter(source=>source.reviewStatus!=="rejected"),
    reports: visibleReports,
  });
}

export async function POST(request: Request) {
  let actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به پایلوت لازم است." }, 401);
  const body = await request.json().catch(() => null) as { projectSlug?: unknown; scopeNote?: unknown; title?: unknown } | null;
  const projectSlug = typeof body?.projectSlug === "string" ? body.projectSlug : "";
  const scopeNote = typeof body?.scopeNote === "string" ? compact(body.scopeNote, MAX_SCOPE_NOTE) : "";
  const requestedTitle = typeof body?.title === "string" ? compact(body.title, 160) : "";
  const project = await projectFromSlug(projectSlug);
  if (!project) return json({ error: "پرونده معتبر نیست." }, 400);
  actor=await getProjectActor(actor,projectSlug);
  if(!actor)return json({error:"پرونده در دسترس نیست."},404);
  if(!canReviewDocuments(actor.role)&&actor.role!=="project_manager")return json({error:"اجازهٔ گزارش ندارید."},403);
  const caseData = await getProjectCaseWithStages(projectSlug, actor);
  if (!caseData) return json({ error: "پرونده معتبر نیست." }, 400);
  const evidence=await getCaseEvidence(caseData.projectCase.id,projectSlug);
  const allowedSources=evidence.docs.filter(r=>r.extraction?.state==="complete"&&r.document.reviewStatus!=="rejected"&&canViewAccessLevel(actor.role,r.document.accessLevel)).map(r=>({...r.document,sourceKind:r.extraction!.sourceKind,characterCount:r.extraction!.characterCount,pageCount:r.extraction!.pageCount,textContent:r.extraction!.textContent}));
  if (!allowedSources.length) return json({ error: "گزارش ساخته نشد: هنوز هیچ متنِ استخراج‌شدهٔ موفق و قابل دسترسی برای این پرونده وجود ندارد. PDF خوانده‌نشده در گزارش به‌کار نمی‌رود." }, 422);

  const now = Date.now();
  const bundle=evidence.bundle;
  const latestRun = (await getDb().select().from(financialRuns).where(and(eq(financialRuns.projectSlug,projectSlug),eq(financialRuns.ownerId,actor.userId))).orderBy(desc(financialRuns.createdAt)).limit(1))[0];
  const content: ReportContent = {
    version: "pilot-draft-v1",
    generatedAt: now,
    projectSummary: bundle ? { description:bundle.definition.description, location:bundle.definition.location, outcome:bundle.definition.outcome, horizonMonths:bundle.definition.horizonMonths, risks:bundle.definition.risks } : undefined,
    financialScenario: latestRun ? {id:latestRun.id,name:latestRun.name,input:JSON.parse(latestRun.inputJson),results:JSON.parse(latestRun.resultJson),createdAt:latestRun.createdAt} : null,
    evidence: allowedSources.map((source) => ({
      documentId: source.id,
      title: source.title,
      category: source.category,
      sourceKind: source.sourceKind,
      characterCount: source.characterCount,
      pageCount: source.pageCount,
      reviewStatus: source.reviewStatus,
      excerpt: compact(source.textContent ?? "", 320),
    })),
    controls: [
      { title: "کفایت ورودی", detail: "هر سندِ بدون متنِ کامل از این پیش‌نویس کنار گذاشته شده و فقط در فهرست اتاق داده باقی می‌ماند." },
      { title: "بازبینی انسانی", detail: "وضعیت بازبینی هر منبع جداگانه نمایش داده می‌شود؛ تولید پیش‌نویس به‌معنای تأیید محتوا نیست." },
      { title: "مرز تصمیم", detail: "این خروجی فقط جمع‌بندی پروندهٔ آزمایشی است و هیچ قیمت مصوب، پیشنهاد عرضه، پرداخت، تخصیص یا حق مالی ایجاد نمی‌کند." },
    ],
    limitations: [
      "استخراج متن ممکن است در اسناد اسکن‌شده یا نمودارها ناقص باشد؛ در چنین حالت‌هایی OCR و تطبیق انسانی لازم است.",
      "این گزارش با قواعد شفاف محصول ساخته شده و کارشناسی رسمی، ارزش‌گذاری رسمی یا تصمیم حقوقی محسوب نمی‌شود.",
    ],
    conclusion: `پیش‌نویس حاضر بر پایهٔ ${allowedSources.length.toLocaleString("fa-IR")} منبعِ دارای متن استخراج‌شده برای پروندهٔ «${project.name}» ساخته شد و برای مرور انسانی آماده است.`,
  };
  const report = {
    id: crypto.randomUUID(),
    caseId: caseData.projectCase.id,
    projectSlug,
    title: requestedTitle || `گزارش کارشناسی آزمایشی | ${project.name}`,
    status: "draft",
    scopeNote: scopeNote || "مرور اولیهٔ منابع خوانده‌شدهٔ اتاق داده برای پایلوت بسته.",
    sourceDocumentIdsJson: JSON.stringify(allowedSources.map((source) => source.id)),
    contentJson: JSON.stringify(content),
    generatedBy: actor.userId,
    generatedAt: now,
  };
  content.fingerprint=await dossierFingerprint(evidence,allowedSources.map(s=>s.id));
  const plan=artifactOf(evidence,"investment_plan");
  if(plan){const p=JSON.parse(plan.contentJson);content.financialScenario={id:p.financialRunId,name:p.name,input:p.input,results:p.results,createdAt:p.savedAt};}
  report.contentJson=JSON.stringify(content);
  await getDb().batch([getDb().insert(sampleReports).values(report),...caseWriteQueries(caseData.projectCase.id,actor.userId,"sample_report"),auditQuery({actorId:actor.userId,caseId:caseData.projectCase.id,action:"sample_report.generated",targetType:"sample_report",targetId:report.id,payload:{sourceDocumentIds:allowedSources.map(s=>s.id)}})]);
  return json({report:{...publicReport(report),isCurrent:true}},201);
}
