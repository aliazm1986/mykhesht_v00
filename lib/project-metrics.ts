import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { caseArtifacts, caseStageDecisions, dataRoomDocuments, projectCases } from "@/db/schema";
import { getProjectBundle, listProjectDefinitions } from "./projects-server";
import { getProjectActor, allowedProjectSlugs, type Actor } from "./control";
import { calculateFinancialScenarios } from "./pilot-domain";
import { properties } from "./data";
import type { ProjectMetric } from "./wealth-model";

const defaultSlugs = new Set(properties.map((p) => p.slug));

export async function projectMetric(actor: Actor, slug: string): Promise<ProjectMetric | null> {
  const a = await getProjectActor(actor, slug);
  const b = a ? await getProjectBundle(slug) : null;
  if (!a || !b) return null;

  const db = getDb();
  const c = (await db.select().from(projectCases).where(eq(projectCases.projectSlug, slug)).limit(1))[0];
  const [stages, docs, plan] = c
    ? await Promise.all([
        db.select().from(caseStageDecisions).where(eq(caseStageDecisions.caseId, c.id)),
        db.select({ reviewStatus: dataRoomDocuments.reviewStatus }).from(dataRoomDocuments).where(eq(dataRoomDocuments.caseId, c.id)),
        db
          .select()
          .from(caseArtifacts)
          .where(and(eq(caseArtifacts.caseId, c.id), eq(caseArtifacts.kind, "investment_plan")))
          .limit(1),
      ])
    : [[], [], []];

  const canRead =
    ["admin", "expert", "project_manager", "independent_reviewer"].includes(a.role) ||
    (stages.length === 9 && stages.every((s) => s.state === "passed"));

  let rates: ProjectMetric["rates"] = null;
  let planRevision: number | null = null;

  if (plan[0] && canRead) {
    const values = calculateFinancialScenarios(JSON.parse(plan[0].contentJson).input);
    rates = {
      conservative: values[0].roiPercent,
      base: values[1].roiPercent,
      optimistic: values[2].roiPercent,
    };
    planRevision = plan[0].revision;
  } else if (defaultSlugs.has(slug) && b.property.estimatedReturnBase > 0) {
    rates = {
      conservative: b.property.estimatedReturnLow || Math.max(15, b.property.estimatedReturnBase - 8),
      base: b.property.estimatedReturnBase,
      optimistic: b.property.estimatedReturnHigh || b.property.estimatedReturnBase + 7,
    };
    planRevision = 1;
  }

  const passedStagesPct = stages.length ? Math.round((stages.filter((s) => s.state === "passed").length / 9) * 100) : 0;
  const fallbackProgress =
    b.property.progress > 0
      ? b.property.progress
      : b.property.targetCapital > 0
        ? Math.round((b.property.raisedCapital / b.property.targetCapital) * 100)
        : 35;

  const readiness = Math.max(passedStagesPct, fallbackProgress);
  const approvedDocsPct = docs.length ? Math.round((docs.filter((d) => d.reviewStatus === "approved").length / docs.length) * 100) : 0;
  const dataQuality = Math.max(approvedDocsPct, defaultSlugs.has(slug) ? 95 : 85);

  return {
    slug,
    name: b.property.name,
    riskLevel: b.definition.riskLevel,
    months: b.definition.horizonMonths,
    readiness,
    dataQuality,
    planRevision: planRevision ?? 1,
    rates,
    unavailableReason: rates ? null : "برنامهٔ مالی در دست تکمیل است.",
  };
}

export async function listProjectMetrics(actor: Actor) {
  const allowed = await allowedProjectSlugs(actor);
  const entries = (await listProjectDefinitions()).filter((p) => allowed === null || allowed.includes(p.definition.slug));
  const result: ProjectMetric[] = [];
  for (const p of entries) {
    const m = await projectMetric(actor, p.definition.slug);
    if (m) result.push(m);
  }
  return result;
}
