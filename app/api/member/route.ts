import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  auditEvents,
  dataRoomDocuments,
  marketOrders,
  memberDetails,
  notifications,
  shareHoldings,
  supportTickets,
  userProfiles,
  userWallets,
} from "@/db/schema";
import { getProjectActor, canViewAccessLevel, getCurrentActor, auditQuery } from "@/lib/control";
import { properties, resolveTierByInvestment, tiers, type InvestorTier } from "@/lib/data";

export const dynamic = "force-dynamic";

const json = (data: unknown, status = 200) =>
  Response.json({ ok: true, data }, { status, headers: { "cache-control": "no-store" } });
const fail = (error: string, status: number) =>
  Response.json({ ok: false, error }, { status, headers: { "cache-control": "no-store" } });
const date = (n: number) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" }).format(n);

async function resolveUserSavedTier(userId: string): Promise<InvestorTier | null> {
  const db = getDb();
  const events = await db
    .select()
    .from(auditEvents)
    .where(and(eq(auditEvents.targetType, "user_tier"), eq(auditEvents.targetId, userId)))
    .orderBy(desc(auditEvents.createdAt))
    .limit(1);
  if (!events[0]) return null;
  try {
    const p = JSON.parse(events[0].payloadJson) as { tierId?: InvestorTier };
    if (p.tierId && tiers.some((t) => t.id === p.tierId)) return p.tierId;
  } catch {
    // ignore
  }
  return null;
}

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return fail("ورود لازم است.", 401);
  const section = new URL(request.url).searchParams.get("section");
  const db = getDb();

  if (section === "notifications") {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.ownerId, actor.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    const visible = [];
    for (const r of rows) {
      const slug = r.href.match(/^\/projects\/([^/]+)\/documents$/)?.[1];
      if (!slug || (await getProjectActor(actor, slug))) {
        visible.push({ ...r, read: !!r.readAt, type: "info", createdAt: date(r.createdAt) });
      }
    }
    return json(visible);
  }

  if (section === "documents") {
    const docs = await db.select().from(dataRoomDocuments).orderBy(desc(dataRoomDocuments.uploadedAt)).limit(200);
    const scoped = await Promise.all(docs.map(async (d) => ({ d, a: await getProjectActor(actor, d.projectSlug) })));
    return json(
      scoped
        .filter(({ d, a }) => a && canViewAccessLevel(a.role, d.accessLevel))
        .map(({ d }) => d)
        .map((d) => ({
          id: d.id,
          title: d.title,
          category: d.category,
          issuedAt: date(rOrUploadDate(d.uploadedAt)),
          version: "فایل ثبت‌شده",
          hash: d.checksumSha256,
          access: d.accessLevel,
          projectId: d.projectSlug,
        })),
    );
  }

  const [detailsRow, walletRow, holdingsRows, ordersRows, ticketsRows, savedTierId] = await Promise.all([
    db.select().from(memberDetails).where(eq(memberDetails.userId, actor.userId)).limit(1),
    db.select().from(userWallets).where(eq(userWallets.userId, actor.userId)).limit(1),
    db.select().from(shareHoldings).where(eq(shareHoldings.userId, actor.userId)),
    db.select().from(marketOrders).where(eq(marketOrders.userId, actor.userId)),
    db.select().from(supportTickets).where(eq(supportTickets.ownerId, actor.userId)),
    resolveUserSavedTier(actor.userId),
  ]);

  const details = detailsRow[0];
  const walletBalanceToman = walletRow[0]?.balanceToman ?? 500_000_000;
  const activeHoldings = holdingsRows.filter((h) => h.shares > 0 || h.lockedShares > 0);
  const totalSharesOwned = activeHoldings.reduce((acc, h) => acc + h.shares + h.lockedShares, 0);
  const investedToman = activeHoldings.reduce((acc, h) => {
    const p = properties.find((item) => item.slug === h.projectSlug);
    const price = p?.tokenPriceCurrent ?? h.avgPriceToman ?? 500_000;
    return acc + (h.shares + h.lockedShares) * price;
  }, 0);

  const resolvedTier = resolveTierByInvestment(investedToman, savedTierId);
  const currentTierIdx = tiers.findIndex((t) => t.id === resolvedTier.id);
  const nextTier = currentTierIdx < tiers.length - 1 ? tiers[currentTierIdx + 1] : null;
  const tierProgressPercent = nextTier
    ? Math.min(100, Math.max(12, Math.round((investedToman / Math.max(1, nextTier.minInvestmentToman)) * 100)))
    : 100;

  const openOrdersCount = ordersRows.filter((o) => o.status === "open").length;

  return json({
    firstName: details?.firstName ?? actor.displayName,
    lastName: details?.lastName ?? "",
    mobile: details?.mobile ?? "",
    email: actor.email,
    role: actor.role,
    kycStatus: "verified",
    tier: `سطح ${resolvedTier.name}`,
    tierId: resolvedTier.id,
    tierName: resolvedTier.name,
    tierColor: resolvedTier.color,
    tierAccess: resolvedTier.access,
    feeDiscountPercent: resolvedTier.feeDiscountPercent,
    investedToman,
    nextTierName: nextTier?.name ?? null,
    nextTierMinToman: nextTier?.minInvestmentToman ?? null,
    tierProgressPercent,
    walletBalanceToman,
    holdingsCount: activeHoldings.length,
    totalSharesOwned,
    openOrdersCount,
    ticketsCount: ticketsRows.length,
  });
}

function rOrUploadDate(n: number) {
  return n || Date.now();
}

export async function PUT(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return fail("ورود لازم است.", 401);
  const db = getDb();
  const body = (await request.json().catch(() => null)) as {
    action?: unknown;
    tierId?: unknown;
    firstName?: unknown;
    lastName?: unknown;
    mobile?: unknown;
  } | null;

  if (body?.action === "read_all") {
    const changed = await db
      .update(notifications)
      .set({ readAt: Date.now() })
      .where(and(eq(notifications.ownerId, actor.userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    return json({ count: changed.length });
  }

  if (body?.action === "set_tier") {
    const tierId = String(body.tierId ?? "").trim() as InvestorTier;
    const foundTier = tiers.find((t) => t.id === tierId);
    if (!foundTier) return fail("سطح کاربری انتخاب‌شده معتبر نیست.", 400);
    const now = Date.now();
    await db.batch([
      auditQuery({
        actorId: actor.userId,
        action: "member.tier_updated",
        targetType: "user_tier",
        targetId: actor.userId,
        payload: { tierId: foundTier.id, tierName: foundTier.name },
      }),
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        ownerId: actor.userId,
        title: `ارتقای سطح کاربری به «سطح ${foundTier.name}»`,
        body: `سطح کاربری حساب شما به «${foundTier.name}» تغییر یافت. تخفیف کارمزد بازار ثانویه: ${foundTier.feeDiscountPercent.toLocaleString("fa-IR")}٪.`,
        href: "/tiers",
        readAt: null,
        createdAt: now,
      }),
    ]);
    return json({
      tierId: foundTier.id,
      tierName: foundTier.name,
      tier: `سطح ${foundTier.name}`,
      feeDiscountPercent: foundTier.feeDiscountPercent,
      tierAccess: foundTier.access,
    });
  }

  if (
    typeof body?.firstName !== "string" ||
    body.firstName.trim().length < 1 ||
    body.firstName.length > 100 ||
    typeof body.lastName !== "string" ||
    body.lastName.length > 100 ||
    typeof body.mobile !== "string" ||
    body.mobile.length > 20 ||
    !/^\+?[\d\s-]*$/.test(body.mobile)
  ) {
    return fail("نام و شمارهٔ تماس معتبر نیست.", 400);
  }

  const now = Date.now();
  const details = {
    userId: actor.userId,
    firstName: body.firstName.trim(),
    lastName: body.lastName.trim(),
    mobile: body.mobile,
    updatedAt: now,
  };
  const fullName = [details.firstName, details.lastName].filter(Boolean).join(" ").trim() || details.firstName;

  await db.batch([
    db.insert(memberDetails).values(details).onConflictDoUpdate({ target: memberDetails.userId, set: details }),
    db.update(userProfiles).set({ displayName: fullName, updatedAt: now }).where(eq(userProfiles.userId, actor.userId)),
    auditQuery({ actorId: actor.userId, action: "member.profile_updated", targetType: "member", targetId: actor.userId }),
  ]);

  return json({
    ...details,
    email: actor.email,
    role: actor.role,
    kycStatus: "verified",
  });
}
