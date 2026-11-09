import { properties } from "@/lib/data";
import { and, eq, inArray, sql } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { auditEvents, caseStageDecisions, projectCases, projectMemberships, userProfiles } from "@/db/schema";
import { getProjectBundle } from "@/lib/projects-server";

export const appRoles = ["viewer", "investor", "expert", "project_manager", "independent_reviewer", "admin"] as const;
export type AppRole = (typeof appRoles)[number];

export const pilotStages = [
  { key: "intake", label: "پذیرش پروژه", responsibleRole: "project_manager" },
  { key: "data_room", label: "اتاق داده", responsibleRole: "expert" },
  { key: "investment_plan", label: "برنامهٔ پروژه", responsibleRole: "project_manager" },
  { key: "sample_report", label: "گزارش کارشناسی آزمایشی", responsibleRole: "expert" },
  { key: "value_bridge", label: "پل ارزش", responsibleRole: "expert" },
  { key: "independent_review", label: "تأیید مستقل", responsibleRole: "independent_reviewer" },
  { key: "closed_pilot_register", label: "ثبت پایلوت بسته", responsibleRole: "project_manager" },
  { key: "scenario_log", label: "ثبت سناریوی آزمایشی", responsibleRole: "expert" },
  { key: "financial_report", label: "گزارش مالی نمونه", responsibleRole: "project_manager" },
] as const;

export type PilotStageKey = (typeof pilotStages)[number]["key"];
export type StageState = "pending" | "active" | "passed" | "blocked";

export type Actor = {
  userId: string;
  displayName: string;
  email: string;
  role: AppRole;
};

export const projectRoles = ["viewer","investor","expert","project_manager","independent_reviewer"] as const;
const defaultCatalogSlugs = new Set(properties.map((p) => p.slug));
const isLocalSessionMode = () => {
  const raw = (env as unknown as { KHESHT_AUTH_MODE?: string }).KHESHT_AUTH_MODE;
  return typeof raw === "string" && raw.trim().replace(/^["']|["']$/g, "") === "local-session";
};
export async function getProjectActor(actor:Actor|null,slug:string):Promise<Actor|null>{
  if(!actor||actor.role==="admin")return actor;
  const rows=await getDb().select().from(projectMemberships).where(and(eq(projectMemberships.projectSlug,slug),eq(projectMemberships.userId,actor.userId))).limit(1);
  const m=rows[0];
  if(m){
    return m.active===1&&(projectRoles as readonly string[]).includes(m.role)?{...actor,role:m.role as AppRole}:null;
  }
  if(isLocalSessionMode()&&defaultCatalogSlugs.has(slug)){
    return {...actor,role:actor.role==="viewer"?"investor":actor.role};
  }
  return null;
}
export async function allowedProjectSlugs(actor:Actor):Promise<string[]|null>{
  if(actor.role==="admin")return null;
  const rows=await getDb().select({slug:projectMemberships.projectSlug,active:projectMemberships.active}).from(projectMemberships).where(eq(projectMemberships.userId,actor.userId));
  const activeSlugs=rows.filter(r=>r.active===1).map(r=>r.slug);
  if(isLocalSessionMode()){
    const revokedSlugs=new Set(rows.filter(r=>r.active===0).map(r=>r.slug));
    const defaults=[...defaultCatalogSlugs].filter(s=>!revokedSlugs.has(s));
    return [...new Set([...defaults,...activeSlugs])];
  }
  return activeSlugs;
}
export function caseWriteQueries(caseId:string,actorId:string,fromStage:PilotStageKey,onlyAfterChange=false){
  const keys=pilotStages.slice(pilotStages.findIndex(s=>s.key===fromStage)).map(s=>s.key),now=Date.now(),db=getDb();
  return[db.update(projectCases).set({revision:sql`${projectCases.revision}+1`,status:"active",updatedAt:now}).where(and(eq(projectCases.id,caseId),onlyAfterChange?sql`changes()>0`:undefined)),
    db.update(caseStageDecisions).set({state:sql`CASE WHEN ${caseStageDecisions.stageKey}=${fromStage} AND ${caseStageDecisions.state}='active' THEN 'active' ELSE 'pending' END`,decisionReason:"شواهد پرونده تغییر کرده است؛ این مرحله و مراحل بعد دوباره بررسی شوند.",updatedBy:actorId,updatedAt:now}).where(and(eq(caseStageDecisions.caseId,caseId),inArray(caseStageDecisions.stageKey,keys),onlyAfterChange?sql`changes()>0`:undefined))] as const;
}

type RuntimeBindings = { KHESHT_BOOTSTRAP_ADMIN_USER_ID?: string };

function isAppRole(value: string): value is AppRole {
  return (appRoles as readonly string[]).includes(value);
}

export function canManageDataRoom(role: AppRole) {
  return ["admin", "project_manager", "expert"].includes(role);
}

export function canReviewDocuments(role: AppRole) {
  return ["admin", "expert", "independent_reviewer"].includes(role);
}

export function canManageStages(role: AppRole) {
  return ["admin", "project_manager", "independent_reviewer"].includes(role);
}

export function canViewAccessLevel(role: AppRole, accessLevel: string) {
  if (accessLevel === "admin") return role === "admin";
  if (accessLevel === "reviewer") return ["admin", "expert", "project_manager", "independent_reviewer"].includes(role);
  return true;
}

export async function getCurrentActor(): Promise<Actor | null> {
  const user = await getChatGPTUser();
  if (!user) return null;
  const db = getDb();
  const now = Date.now();
  const bootstrapId = (env as unknown as RuntimeBindings).KHESHT_BOOTSTRAP_ADMIN_USER_ID;
  const bootstrapRole: AppRole = bootstrapId === user.userId ? "admin" : "viewer";
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  const existing = rows[0];

  if (!existing) {
    await db.insert(userProfiles).values({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      role: bootstrapRole,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing({target:userProfiles.userId});
    const saved=(await db.select().from(userProfiles).where(eq(userProfiles.userId,user.userId)).limit(1))[0];
    const savedRole=bootstrapRole==="admin"?"admin":saved&&isAppRole(saved.role)?saved.role:"viewer";
    return { userId: user.userId, email: user.email, displayName: user.displayName, role: savedRole };
  }

  const role = bootstrapRole === "admin" ? "admin" : (isAppRole(existing.role) ? existing.role : "viewer");
  if (existing.email !== user.email || existing.displayName !== user.displayName || existing.role !== role) {
    await db.update(userProfiles).set({ email: user.email, displayName: user.displayName, role, updatedAt: now }).where(eq(userProfiles.userId, user.userId));
  }
  return { userId: user.userId, email: user.email, displayName: user.displayName, role };
}

export async function projectFromSlug(projectSlug: string) {
  return (await getProjectBundle(projectSlug))?.property;
}

export async function ensureProjectCase(projectSlug: string, actor: Actor) {
  const project = await projectFromSlug(projectSlug);
  if (!project) return null;
  const db = getDb();
  const existing = await db.select().from(projectCases).where(eq(projectCases.projectSlug, projectSlug)).limit(1);
  if (existing[0]) {
    const stageCount=await db.select({id:caseStageDecisions.id}).from(caseStageDecisions).where(eq(caseStageDecisions.caseId,existing[0].id));
    if(stageCount.length===pilotStages.length)return existing[0];
  }

  const now = Date.now();
  const caseId = existing[0]?.id ?? `case-${projectSlug}`;
  await db.insert(projectCases).values({
    id: caseId,
    projectSlug,
    title: project.name,
    status: "active",
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing({target:projectCases.projectSlug});

  for (const [index, stage] of pilotStages.entries()) {
    const state: StageState = index === 0 ? "active" : "pending";
    await db.insert(caseStageDecisions).values({
      id: crypto.randomUUID(),
      caseId,
      stageKey: stage.key,
      state,
      responsibleRole: stage.responsibleRole,
      decisionReason: "وضعیت آغازین پرونده برای آزمون گردش کار؛ نیازمند بازبینی انسانی است.",
      updatedBy: actor.userId,
      updatedAt: now,
    }).onConflictDoNothing({target:[caseStageDecisions.caseId,caseStageDecisions.stageKey]});
  }

  return (await db.select().from(projectCases).where(eq(projectCases.projectSlug,projectSlug)).limit(1))[0];
}

export async function getCaseStages(caseId: string) {
  const rows=await getDb().select().from(caseStageDecisions).where(eq(caseStageDecisions.caseId, caseId));
  return rows.sort((a,b)=>pilotStages.findIndex(s=>s.key===a.stageKey)-pilotStages.findIndex(s=>s.key===b.stageKey));
}

export async function getProjectCaseWithStages(projectSlug: string, actor: Actor) {
  if(!await getProjectActor(actor,projectSlug))return null;
  const projectCase = await ensureProjectCase(projectSlug, actor);
  if (!projectCase) return null;
  const stages = await getCaseStages(projectCase.id);
  return { projectCase, stages };
}

export function auditQuery(input: { actorId: string; caseId?: string | null; action: string; targetType: string; targetId: string; payload?: Record<string, unknown> }) {
  return getDb().insert(auditEvents).values({
    id: crypto.randomUUID(),
    actorId: input.actorId,
    caseId: input.caseId ?? null,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    payloadJson: JSON.stringify(input.payload ?? {}),
    createdAt: Date.now(),
  });
}

export async function logAuditEvent(input: Parameters<typeof auditQuery>[0]) { await auditQuery(input); }

export async function hasAnotherActiveStage(caseId: string, excludeStageKey: string) {
  const rows = await getDb().select().from(caseStageDecisions).where(and(eq(caseStageDecisions.caseId, caseId), eq(caseStageDecisions.state, "active")));
  return rows.some((row) => row.stageKey !== excludeStageKey);
}
