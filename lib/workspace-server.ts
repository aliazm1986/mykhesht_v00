import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  caseStageDecisions,
  financialRuns,
  marketOrders,
  pilotRecords,
  projectCases,
  shareHoldings,
  userWallets,
  wealthScenarios,
} from "@/db/schema";
import { allowedProjectSlugs, getCurrentActor, pilotStages } from "@/lib/control";
import { getProjectBundle } from "@/lib/projects-server";

export async function getWorkspaceSummary() {
  const actor = await getCurrentActor();
  if (!actor) return null;
  const db = getDb();
  const allowed = await allowedProjectSlugs(actor);
  const [allNotes, allRuns, allScenarios, walletRow, holdingsRows, openOrdersRows] = await Promise.all([
    db.select().from(pilotRecords).where(eq(pilotRecords.ownerId, actor.userId)).orderBy(desc(pilotRecords.createdAt)).limit(500),
    db.select().from(financialRuns).where(eq(financialRuns.ownerId, actor.userId)).orderBy(desc(financialRuns.createdAt)).limit(100),
    db.select().from(wealthScenarios).where(eq(wealthScenarios.ownerId, actor.userId)).orderBy(desc(wealthScenarios.updatedAt)).limit(20),
    db.select().from(userWallets).where(eq(userWallets.userId, actor.userId)).limit(1),
    db.select().from(shareHoldings).where(eq(shareHoldings.userId, actor.userId)),
    db.select().from(marketOrders).where(eq(marketOrders.userId, actor.userId)).orderBy(desc(marketOrders.createdAt)).limit(50),
  ]);

  const notes = allNotes.filter((r) => allowed === null || allowed.includes(r.projectSlug));
  const runs = allRuns.filter((r) => allowed === null || allowed.includes(r.projectSlug));
  const scenarios = allScenarios.filter(
    (r) => allowed === null || JSON.parse(r.selectedProjectSlugs).every((slug: string) => allowed.includes(slug)),
  );
  const holdings = holdingsRows.filter((h) => h.shares > 0 || h.lockedShares > 0);
  const slugs = [
    ...new Set([
      ...holdings.map((h) => h.projectSlug),
      ...notes.map((n) => n.projectSlug),
      ...runs.map((r) => r.projectSlug),
    ]),
  ];
  const cases = slugs.length ? await db.select().from(projectCases).where(inArray(projectCases.projectSlug, slugs)) : [];
  const stages = cases.length
    ? await db.select().from(caseStageDecisions).where(inArray(caseStageDecisions.caseId, cases.map((c) => c.id)))
    : [];
  const bundles = await Promise.all(slugs.map(getProjectBundle));
  const records = bundles.flatMap((b, i) => {
    if (!b) return [];
    const c = cases.find((c) => c.projectSlug === slugs[i]);
    const active = stages.find((s) => s.caseId === c?.id && s.state === "active");
    const h = holdings.find((item) => item.projectSlug === slugs[i]);
    const unitPrice = b.property.tokenPriceCurrent || b.property.tokenPriceInitial || 500_000;
    const totalShares = (h?.shares ?? 0) + (h?.lockedShares ?? 0);
    return [
      {
        slug: b.property.slug,
        name: b.property.name,
        location: b.property.location,
        tokenSymbol: b.property.tokenSymbol || `KH-${b.property.slug.slice(0, 5).toUpperCase()}`,
        shares: h?.shares ?? 0,
        lockedShares: h?.lockedShares ?? 0,
        avgPriceToman: h?.avgPriceToman ?? unitPrice,
        currentPriceToman: unitPrice,
        marketValueToman: totalShares * unitPrice,
        stage: pilotStages.find((s) => s.key === active?.stageKey)?.label ?? b.property.status,
        last: new Date(
          h?.updatedAt ?? c?.updatedAt ?? notes.find((n) => n.projectSlug === slugs[i])?.createdAt ?? Date.now(),
        ).toLocaleDateString("fa-IR"),
        status: totalShares > 0 ? "دارای سهام فعال" : active ? "در جریان" : "در انتظار شروع",
        role: actor.role,
      },
    ];
  });

  const walletBalanceToman = walletRow[0]?.balanceToman ?? 500_000_000;
  const portfolioValueToman = records.reduce((acc, r) => acc + (r.marketValueToman ?? 0), 0);

  return {
    actor,
    records,
    runs,
    scenarios,
    walletBalanceToman,
    portfolioValueToman,
    openOrdersCount: openOrdersRows.filter((o) => o.status === "open").length,
    noteCount: notes.length,
    pendingStages: stages.filter((s) => s.state === "pending" || s.state === "blocked").length,
  };
}
