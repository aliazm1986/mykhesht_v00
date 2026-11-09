import { compareProjects } from "@/lib/wealth-model";
import { projectMetric } from "@/lib/project-metrics";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { wealthScenarios } from "@/db/schema";
import { allowedProjectSlugs, getProjectActor, getCurrentActor, auditQuery } from "@/lib/control";

export const dynamic = "force-dynamic";

const analysisStyles = ["guarded", "balanced", "growth"] as const;
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود به حساب کاربری لازم است." }, 401);
  const allowed = await allowedProjectSlugs(actor);
  const scenarios = await getDb()
    .select()
    .from(wealthScenarios)
    .where(eq(wealthScenarios.ownerId, actor.userId))
    .orderBy(desc(wealthScenarios.updatedAt))
    .limit(25);
  return json({
    scenarios: scenarios.filter(
      (s) => allowed === null || JSON.parse(s.selectedProjectSlugs).every((slug: string) => allowed.includes(slug)),
    ),
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "برای ذخیرهٔ سناریو ابتدا وارد حساب کاربری شوید." }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "درخواست معتبر نیست." }, 400);
  }
  const input = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  if (!input || typeof input.name !== "string" || input.name.trim().length < 2 || input.name.trim().length > 80) {
    return json({ error: "نام سناریو باید بین ۲ تا ۸۰ نویسه باشد." }, 400);
  }
  if (
    !Array.isArray(input.selectedProjectSlugs) ||
    input.selectedProjectSlugs.length < 1 ||
    input.selectedProjectSlugs.length > 5 ||
    input.selectedProjectSlugs.some((slug) => typeof slug !== "string")
  ) {
    return json({ error: "یک تا پنج پروژهٔ معتبر برای سبد انتخاب کنید." }, 400);
  }
  const selectedProjectSlugs = [...new Set(input.selectedProjectSlugs as string[])];
  if (
    typeof input.virtualBudget !== "number" ||
    !Number.isSafeInteger(input.virtualBudget) ||
    input.virtualBudget < 1_000_000 ||
    input.virtualBudget > 100_000_000_000
  ) {
    return json({ error: "مبلغ بودجهٔ سبد معتبر نیست." }, 400);
  }
  if (
    typeof input.horizonMonths !== "number" ||
    !Number.isInteger(input.horizonMonths) ||
    input.horizonMonths < 6 ||
    input.horizonMonths > 36
  ) {
    return json({ error: "افق سرمایه‌گذاری باید بین ۶ تا ۳۶ ماه باشد." }, 400);
  }
  if (typeof input.analysisStyle !== "string" || !(analysisStyles as readonly string[]).includes(input.analysisStyle)) {
    return json({ error: "استراتژی چیدمان سبد معتبر نیست." }, 400);
  }

  if ((await Promise.all(selectedProjectSlugs.map((slug) => getProjectActor(actor, slug)))).some((a) => !a)) {
    return json({ error: "یکی از پروژه‌های انتخاب‌شده در دسترس نیست." }, 404);
  }
  const metrics = await Promise.all(selectedProjectSlugs.map((slug) => projectMetric(actor, slug)));
  if (metrics.some((m) => !m)) return json({ error: "اطلاعات یکی از پروژه‌ها یافت نشد." }, 404);

  const comp = compareProjects(
    metrics.filter((m) => m !== null),
    input.analysisStyle as "guarded" | "balanced" | "growth",
    input.horizonMonths,
  );
  const snapshotJson = JSON.stringify(comp);
  const now = Date.now();
  const scenario = {
    id: crypto.randomUUID(),
    ownerId: actor.userId,
    name: input.name.trim(),
    selectedProjectSlugs: JSON.stringify(selectedProjectSlugs),
    virtualBudget: input.virtualBudget,
    horizonMonths: input.horizonMonths,
    analysisStyle: input.analysisStyle,
    snapshotJson,
    createdAt: now,
    updatedAt: now,
  };
  await getDb().batch([
    getDb().insert(wealthScenarios).values(scenario),
    auditQuery({
      actorId: actor.userId,
      action: "wealth.scenario_saved",
      targetType: "wealth_scenario",
      targetId: scenario.id,
      payload: { selectedProjectSlugs, horizonMonths: input.horizonMonths, analysisStyle: input.analysisStyle },
    }),
  ]);
  return json({ scenario }, 201);
}

export async function DELETE(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود لازم است." }, 401);
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return json({ error: "شناسهٔ سناریو مشخص نشده است." }, 400);

  const db = getDb();
  await db
    .delete(wealthScenarios)
    .where(and(eq(wealthScenarios.id, id), eq(wealthScenarios.ownerId, actor.userId)));

  return json({ ok: true, message: "سناریو با موفقیت حذف شد." });
}
