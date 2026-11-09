import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { auditEvents, marketOrders, marketTrades, notifications, shareHoldings, userWallets } from "@/db/schema";
import { allowedProjectSlugs, auditQuery, getCurrentActor, getProjectActor } from "@/lib/control";
import { getProjectBundle, listProjectDefinitions, toProject } from "@/lib/projects-server";

export const dynamic = "force-dynamic";

const json = (v: unknown, status = 200) =>
  Response.json(v, { status, headers: { "cache-control": "no-store" } });

const DEFAULT_WALLET_TOMAN = 500_000_000;

async function ensureWallet(userId: string) {
  const db = getDb();
  const existing = (await db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1))[0];
  if (existing) return existing;
  const now = Date.now();
  await db
    .insert(userWallets)
    .values({ userId, balanceToman: DEFAULT_WALLET_TOMAN, updatedAt: now })
    .onConflictDoNothing({ target: userWallets.userId });
  return (
    (await db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1))[0] ?? {
      userId,
      balanceToman: DEFAULT_WALLET_TOMAN,
      updatedAt: now,
    }
  );
}

// Compute the user's Rental Wallet state from their rental-project holdings + recorded rental events
async function computeRentalWallet(
  userId: string,
  holdingsRows: Array<{ projectSlug: string; shares: number; lockedShares: number; avgPriceToman: number }>,
  projects: Array<{
    slug: string;
    name: string;
    tokenSymbol: string;
    investmentModel: string;
    tokenPriceCurrent: number;
    rentalYield: number;
  }>,
) {
  const db = getDb();
  const userAudits = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.actorId, userId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(200);

  let claimedExtraToman = 0;
  let transferredToMainToman = 0;
  for (const ev of userAudits) {
    try {
      const payload = JSON.parse(ev.payloadJson) as { amountToman?: number };
      if (ev.action === "wallet.rental_claim" && typeof payload.amountToman === "number") {
        claimedExtraToman += payload.amountToman;
      } else if (ev.action === "wallet.rental_transfer" && typeof payload.amountToman === "number") {
        transferredToMainToman += payload.amountToman;
      }
    } catch {
      // ignore malformed payload
    }
  }

  const breakdown: Array<{
    projectSlug: string;
    projectName: string;
    tokenSymbol: string;
    shares: number;
    rentalYield: number;
    monthlyRentToman: number;
    accruedRentToman: number;
  }> = [];

  let baseAccruedTotal = 0;
  for (const h of holdingsRows) {
    const totShares = (h.shares ?? 0) + (h.lockedShares ?? 0);
    if (totShares <= 0) continue;
    const p = projects.find((item) => item.slug === h.projectSlug);
    if (!p) continue;
    // Rental projects are those with investmentModel === "rent" or rentalYield > 0
    if (p.investmentModel !== "rent" && (p.rentalYield ?? 0) <= 0) continue;
    const yieldPct = p.rentalYield > 0 ? p.rentalYield : 11;
    const marketValue = totShares * (p.tokenPriceCurrent || h.avgPriceToman || 525_000);
    const monthlyRent = Math.max(25_000, Math.round((marketValue * (yieldPct / 100)) / 12));
    // Default accrued = 3 months of rental income for each held rental project
    const accruedRent = monthlyRent * 3;
    baseAccruedTotal += accruedRent;
    breakdown.push({
      projectSlug: p.slug,
      projectName: p.name,
      tokenSymbol: p.tokenSymbol,
      shares: totShares,
      rentalYield: yieldPct,
      monthlyRentToman: monthlyRent,
      accruedRentToman: accruedRent,
    });
  }

  const availableRentalToman = Math.max(0, baseAccruedTotal + claimedExtraToman - transferredToMainToman);
  const totalEarnedRentalToman = baseAccruedTotal + claimedExtraToman;

  return {
    balanceToman: availableRentalToman,
    totalEarnedRentalToman,
    transferredToMainToman,
    breakdown,
  };
}

async function seedMarketMakerOrdersIfEmpty(projectSlug: string, basePrice: number) {
  const db = getDb();
  const openOrders = await db
    .select({ id: marketOrders.id })
    .from(marketOrders)
    .where(and(eq(marketOrders.projectSlug, projectSlug), eq(marketOrders.status, "open")))
    .limit(1);
  if (openOrders.length > 0) return;

  const now = Date.now();
  const step = Math.max(5_000, Math.round((basePrice * 0.015) / 1000) * 1000);
  const seedOrders = [
    {
      id: `mm-sell-1-${projectSlug}`,
      userId: "market-maker-pool",
      userDisplayName: "صندوق بازارگردان خشت",
      projectSlug,
      side: "sell",
      priceToman: basePrice,
      initialShares: 120,
      remainingShares: 120,
      status: "open",
      createdAt: now - 3600_000,
      updatedAt: now - 3600_000,
    },
    {
      id: `mm-sell-2-${projectSlug}`,
      userId: "market-maker-pool",
      userDisplayName: "عرضهٔ سرمایه‌گذار اولیه",
      projectSlug,
      side: "sell",
      priceToman: basePrice + step,
      initialShares: 85,
      remainingShares: 85,
      status: "open",
      createdAt: now - 2400_000,
      updatedAt: now - 2400_000,
    },
    {
      id: `mm-buy-1-${projectSlug}`,
      userId: "market-maker-pool",
      userDisplayName: "صندوق بازارگردان خشت",
      projectSlug,
      side: "buy",
      priceToman: Math.max(100_000, basePrice - step),
      initialShares: 100,
      remainingShares: 100,
      status: "open",
      createdAt: now - 3000_000,
      updatedAt: now - 3000_000,
    },
    {
      id: `mm-buy-2-${projectSlug}`,
      userId: "market-maker-pool",
      userDisplayName: "تقاضای خریدار سازمانی",
      projectSlug,
      side: "buy",
      priceToman: Math.max(100_000, basePrice - step * 2),
      initialShares: 150,
      remainingShares: 150,
      status: "open",
      createdAt: now - 1800_000,
      updatedAt: now - 1800_000,
    },
  ];

  for (const o of seedOrders) {
    await db.insert(marketOrders).values(o).onConflictDoNothing({ target: marketOrders.id });
  }
}

export async function GET(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "برای مشاهده و معامله در بازار ابتدا وارد حساب کاربری شوید." }, 401);

  const db = getDb();
  const wallet = await ensureWallet(actor.userId);
  const allowed = await allowedProjectSlugs(actor);
  const allDefs = (await listProjectDefinitions()).filter(
    (p) => allowed === null || allowed.includes(p.definition.slug),
  );
  const projects = allDefs.map((p) => {
    const prop = toProject(p.definition);
    return {
      slug: prop.slug,
      name: prop.name,
      location: prop.location,
      type: prop.type,
      investmentModel: prop.investmentModel,
      tokenSymbol: prop.tokenSymbol || `KH-${prop.slug.slice(0, 5).toUpperCase()}`,
      tokenPriceInitial: prop.tokenPriceInitial || 500_000,
      tokenPriceCurrent: prop.tokenPriceCurrent || 525_000,
      availableTokenSupply: prop.availableTokenSupply || 25_000,
      totalTokenSupply: prop.totalTokenSupply || 50_000,
      estimatedReturnBase: prop.estimatedReturnBase || 24,
      rentalYield: prop.rentalYield ?? 0,
      riskLevel: prop.riskLevel,
      status: prop.status,
    };
  });

  const url = new URL(request.url);
  const requestedSlug = url.searchParams.get("project") || "";

  if (requestedSlug) {
    const targetProj = projects.find((p) => p.slug === requestedSlug);
    if (targetProj) {
      await seedMarketMakerOrdersIfEmpty(targetProj.slug, targetProj.tokenPriceCurrent);
    }
  } else if (projects[0]) {
    await seedMarketMakerOrdersIfEmpty(projects[0].slug, projects[0].tokenPriceCurrent);
  }

  const activeOrderBookSlug = requestedSlug || projects[0]?.slug || "";

  const [holdingsRows, orderBookRows, myOrdersRows, recentTradesRows] = await Promise.all([
    db.select().from(shareHoldings).where(eq(shareHoldings.userId, actor.userId)),
    activeOrderBookSlug
      ? db
          .select()
          .from(marketOrders)
          .where(and(eq(marketOrders.projectSlug, activeOrderBookSlug), eq(marketOrders.status, "open")))
          .orderBy(asc(marketOrders.priceToman), asc(marketOrders.createdAt))
          .limit(100)
      : Promise.resolve([]),
    db
      .select()
      .from(marketOrders)
      .where(eq(marketOrders.userId, actor.userId))
      .orderBy(desc(marketOrders.createdAt))
      .limit(50),
    requestedSlug
      ? db
          .select()
          .from(marketTrades)
          .where(eq(marketTrades.projectSlug, requestedSlug))
          .orderBy(desc(marketTrades.createdAt))
          .limit(40)
      : db.select().from(marketTrades).orderBy(desc(marketTrades.createdAt)).limit(40),
  ]);

  const rentalWallet = await computeRentalWallet(actor.userId, holdingsRows, projects);

  const sellOrders = orderBookRows
    .filter((o) => o.side === "sell" && o.remainingShares > 0)
    .sort((a, b) => a.priceToman - b.priceToman || a.createdAt - b.createdAt);
  const buyOrders = orderBookRows
    .filter((o) => o.side === "buy" && o.remainingShares > 0)
    .sort((a, b) => b.priceToman - a.priceToman || a.createdAt - b.createdAt);

  return json({
    actor: {
      userId: actor.userId,
      displayName: actor.displayName,
      email: actor.email,
      role: actor.role,
    },
    wallet: {
      balanceToman: wallet.balanceToman,
      rentalBalanceToman: rentalWallet.balanceToman,
      updatedAt: wallet.updatedAt,
    },
    rentalWallet,
    projects,
    selectedProject: activeOrderBookSlug,
    holdings: holdingsRows,
    orderBook: {
      sells: sellOrders,
      buys: buyOrders,
    },
    myOrders: myOrdersRows,
    recentTrades: recentTradesRows,
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "برای انجام معامله ابتدا وارد حساب کاربری شوید." }, 401);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") {
    return json({ error: "نوع عملیات مشخص نشده است." }, 400);
  }

  const db = getDb();
  const now = Date.now();
  const wallet = await ensureWallet(actor.userId);
  const action = body.action;

  // 1. Wallet Top-Up
  if (action === "topup") {
    const amount = Number(body.amountToman ?? 100_000_000);
    if (!Number.isSafeInteger(amount) || amount < 1_000_000 || amount > 10_000_000_000) {
      return json({ error: "مبلغ شارژ باید بین ۱ میلیون تا ۱۰ میلیارد تومان باشد." }, 400);
    }
    const newBalance = wallet.balanceToman + amount;
    await db
      .update(userWallets)
      .set({ balanceToman: newBalance, updatedAt: now })
      .where(eq(userWallets.userId, actor.userId));
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      ownerId: actor.userId,
      title: `شارژ کیف پول به مبلغ ${amount.toLocaleString("fa-IR")} تومان`,
      body: `موجودی کیف پول نقدی شما به ${newBalance.toLocaleString("fa-IR")} تومان افزایش یافت.`,
      href: "/dashboard",
      readAt: null,
      createdAt: now,
    });
    await auditQuery({
      actorId: actor.userId,
      action: "wallet.topup",
      targetType: "wallet",
      targetId: actor.userId,
      payload: { amountToman: amount, newBalance },
    });
    return json({
      ok: true,
      message: `کیف پول شما به مبلغ ${amount.toLocaleString("fa-IR")} تومان شارژ شد.`,
      balanceToman: newBalance,
    });
  }

  // 1b. Claim Monthly Rental Dividend into Rental Wallet (کیف پول اجاره)
  if (action === "claim_rental_income") {
    const holdingsRows = await db.select().from(shareHoldings).where(eq(shareHoldings.userId, actor.userId));
    const allDefs = await listProjectDefinitions();
    const projects = allDefs.map((p) => {
      const prop = toProject(p.definition);
      return {
        slug: prop.slug,
        name: prop.name,
        tokenSymbol: prop.tokenSymbol || "KH",
        investmentModel: prop.investmentModel,
        tokenPriceCurrent: prop.tokenPriceCurrent || 525_000,
        rentalYield: prop.rentalYield ?? 0,
      };
    });

    const rentalInfo = await computeRentalWallet(actor.userId, holdingsRows, projects);
    const monthlySum = rentalInfo.breakdown.reduce((acc, b) => acc + b.monthlyRentToman, 0);
    const payoutAmount = monthlySum > 0 ? monthlySum : 2_500_000;

    await db.batch([
      auditQuery({
        actorId: actor.userId,
        action: "wallet.rental_claim",
        targetType: "rental_wallet",
        targetId: actor.userId,
        payload: {
          amountToman: payoutAmount,
          projectsCount: rentalInfo.breakdown.length,
        },
      }),
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        ownerId: actor.userId,
        title: `واریز سود اجاره به کیف پول اجاره (${payoutAmount.toLocaleString("fa-IR")} تومان)`,
        body: `عواید دورهٔ جاری پروژه‌های اجاره‌داری به مبلغ ${payoutAmount.toLocaleString("fa-IR")} تومان به کیف پول اجارهٔ شما واریز شد.`,
        href: "/dashboard",
        readAt: null,
        createdAt: now,
      }),
    ]);

    return json({
      ok: true,
      message: `مبلغ ${payoutAmount.toLocaleString("fa-IR")} تومان از محل عواید پروژه‌های اجاره‌محور (ساخت - اجاره) به کیف پول اجارهٔ شما واریز شد.`,
      rentalBalanceToman: rentalInfo.balanceToman + payoutAmount,
    });
  }

  // 1c. Transfer Rental Wallet Balance to Main Cash Wallet
  if (action === "transfer_rental_to_main") {
    const holdingsRows = await db.select().from(shareHoldings).where(eq(shareHoldings.userId, actor.userId));
    const allDefs = await listProjectDefinitions();
    const projects = allDefs.map((p) => {
      const prop = toProject(p.definition);
      return {
        slug: prop.slug,
        name: prop.name,
        tokenSymbol: prop.tokenSymbol || "KH",
        investmentModel: prop.investmentModel,
        tokenPriceCurrent: prop.tokenPriceCurrent || 525_000,
        rentalYield: prop.rentalYield ?? 0,
      };
    });
    const rentalInfo = await computeRentalWallet(actor.userId, holdingsRows, projects);
    if (rentalInfo.balanceToman <= 0) {
      return json({ error: "موجودی قابل انتقال در کیف پول اجاره وجود ندارد." }, 400);
    }

    const amountToTransfer = rentalInfo.balanceToman;
    const newMainBalance = wallet.balanceToman + amountToTransfer;

    await db.batch([
      db
        .update(userWallets)
        .set({ balanceToman: newMainBalance, updatedAt: now })
        .where(eq(userWallets.userId, actor.userId)),
      auditQuery({
        actorId: actor.userId,
        action: "wallet.rental_transfer",
        targetType: "rental_wallet",
        targetId: actor.userId,
        payload: { amountToman: amountToTransfer, newMainBalance },
      }),
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        ownerId: actor.userId,
        title: `انتقال ${amountToTransfer.toLocaleString("fa-IR")} تومان از کیف پول اجاره به کیف پول اصلی`,
        body: `موجودی کیف پول اجاره به کیف پول نقدی اصلی شما منتقل شد و آمادهٔ سرمایه‌گذاری مجدد یا برداشت است.`,
        href: "/dashboard",
        readAt: null,
        createdAt: now,
      }),
    ]);

    return json({
      ok: true,
      message: `مبلغ ${amountToTransfer.toLocaleString("fa-IR")} تومان از کیف پول اجاره به کیف پول اصلی شما منتقل شد.`,
      balanceToman: newMainBalance,
      rentalBalanceToman: 0,
    });
  }

  // 2. Primary Buy (Direct Issuance from Project)
  if (action === "primary_buy") {
    const projectSlug = String(body.projectSlug ?? "").trim();
    const shares = Number(body.shares ?? 0);
    if (!projectSlug || !Number.isSafeInteger(shares) || shares < 1 || shares > 100_000) {
      return json({ error: "تعداد سهام واردشده معتبر نیست (حداقل ۱ سهم)." }, 400);
    }
    const scoped = await getProjectActor(actor, projectSlug);
    if (!scoped) return json({ error: "دسترسی به این پروژه ندارید." }, 403);
    const bundle = await getProjectBundle(projectSlug);
    if (!bundle) return json({ error: "پروژه یافت نشد." }, 404);

    const unitPrice = bundle.property.tokenPriceCurrent || bundle.property.tokenPriceInitial || 500_000;
    const totalCost = shares * unitPrice;

    if (wallet.balanceToman < totalCost) {
      return json(
        {
          error: `موجودی کیف پول (${wallet.balanceToman.toLocaleString("fa-IR")} تومان) برای خرید ${shares.toLocaleString("fa-IR")} سهم (${totalCost.toLocaleString("fa-IR")} تومان) کافی نیست. لطفاً کیف پول خود را شارژ کنید.`,
        },
        400,
      );
    }

    const existingHolding = (
      await db
        .select()
        .from(shareHoldings)
        .where(and(eq(shareHoldings.userId, actor.userId), eq(shareHoldings.projectSlug, projectSlug)))
        .limit(1)
    )[0];

    const prevShares = existingHolding ? existingHolding.shares + existingHolding.lockedShares : 0;
    const prevAvg = existingHolding ? existingHolding.avgPriceToman : unitPrice;
    const nextTotalShares = prevShares + shares;
    const nextAvgPrice = Math.round((prevShares * prevAvg + shares * unitPrice) / Math.max(1, nextTotalShares));

    const tradeId = crypto.randomUUID();
    const newBalance = wallet.balanceToman - totalCost;

    const isRentalProject = bundle.property.investmentModel === "rent" || (bundle.property.rentalYield ?? 0) > 0;

    await db.batch([
      db.update(userWallets).set({ balanceToman: newBalance, updatedAt: now }).where(eq(userWallets.userId, actor.userId)),
      existingHolding
        ? db
            .update(shareHoldings)
            .set({
              shares: existingHolding.shares + shares,
              avgPriceToman: nextAvgPrice,
              updatedAt: now,
            })
            .where(eq(shareHoldings.id, existingHolding.id))
        : db.insert(shareHoldings).values({
            id: crypto.randomUUID(),
            userId: actor.userId,
            projectSlug,
            shares,
            lockedShares: 0,
            avgPriceToman: unitPrice,
            updatedAt: now,
          }),
      db.insert(marketTrades).values({
        id: tradeId,
        projectSlug,
        buyOrderId: null,
        sellOrderId: null,
        buyerId: actor.userId,
        sellerId: "primary-issuance",
        shares,
        priceToman: unitPrice,
        totalToman: totalCost,
        kind: "primary",
        createdAt: now,
      }),
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        ownerId: actor.userId,
        title: `خرید ${shares.toLocaleString("fa-IR")} سهم از ${bundle.property.name}`,
        body: `تعداد ${shares.toLocaleString("fa-IR")} سهم با قیمت واحد ${unitPrice.toLocaleString("fa-IR")} تومان به پرتفوی و داشبورد شما اضافه شد.${isRentalProject ? " عواید این پروژه به کیف پول اجارهٔ شما واریز می‌گردد." : ""}`,
        href: "/dashboard",
        readAt: null,
        createdAt: now,
      }),
      auditQuery({
        actorId: actor.userId,
        action: "market.primary_buy",
        targetType: "project",
        targetId: projectSlug,
        payload: { shares, unitPrice, totalCost, tradeId },
      }),
    ]);

    return json(
      {
        ok: true,
        tradeId,
        message: `خرید ${shares.toLocaleString("fa-IR")} سهم از «${bundle.property.name}» با موفقیت انجام شد و به داشبورد شما اضافه گردید.${isRentalProject ? " (عواید اجارهٔ این سهم در کیف پول اجاره محاسبه می‌شود)" : ""}`,
        balanceToman: newBalance,
      },
      201,
    );
  }

  // 3. Place Order in Secondary Market (Buy or Sell) with Automatic Matching
  if (action === "place_order") {
    const projectSlug = String(body.projectSlug ?? "").trim();
    const side = body.side === "buy" ? "buy" : body.side === "sell" ? "sell" : null;
    const shares = Number(body.shares ?? 0);
    const priceToman = Number(body.priceToman ?? 0);

    if (!projectSlug || !side || !Number.isSafeInteger(shares) || shares < 1 || shares > 100_000) {
      return json({ error: "تعداد سهام و نوع سفارش (خرید/فروش) را به درستی وارد کنید." }, 400);
    }
    if (!Number.isSafeInteger(priceToman) || priceToman < 50_000 || priceToman > 100_000_000) {
      return json({ error: "قیمت هر سهم باید بین ۵۰ هزار تا ۱۰۰ میلیون تومان باشد." }, 400);
    }

    const scoped = await getProjectActor(actor, projectSlug);
    if (!scoped) return json({ error: "دسترسی به این پروژه ندارید." }, 403);
    const bundle = await getProjectBundle(projectSlug);
    if (!bundle) return json({ error: "پروژه یافت نشد." }, 404);

    await seedMarketMakerOrdersIfEmpty(projectSlug, bundle.property.tokenPriceCurrent || 525_000);

    if (side === "sell") {
      const holding = (
        await db
          .select()
          .from(shareHoldings)
          .where(and(eq(shareHoldings.userId, actor.userId), eq(shareHoldings.projectSlug, projectSlug)))
          .limit(1)
      )[0];
      if (!holding || holding.shares < shares) {
        return json(
          {
            error: `تعداد سهام قابل فروش شما در این پروژه (${(holding?.shares ?? 0).toLocaleString("fa-IR")} سهم) کمتر از مقدار سفارش فروش (${shares.toLocaleString("fa-IR")} سهم) است.`,
          },
          400,
        );
      }

      await db
        .update(shareHoldings)
        .set({
          shares: holding.shares - shares,
          lockedShares: holding.lockedShares + shares,
          updatedAt: now,
        })
        .where(eq(shareHoldings.id, holding.id));

      const orderId = crypto.randomUUID();
      let remaining = shares;
      let totalProceeds = 0;
      let matchedShares = 0;

      const candidateBuys = (
        await db
          .select()
          .from(marketOrders)
          .where(and(eq(marketOrders.projectSlug, projectSlug), eq(marketOrders.status, "open"), eq(marketOrders.side, "buy")))
      ).sort((a, b) => b.priceToman - a.priceToman || a.createdAt - b.createdAt);

      for (const buyOrder of candidateBuys) {
        if (remaining <= 0) break;
        if (buyOrder.priceToman < priceToman) break;
        if (buyOrder.userId === actor.userId) continue;

        const fillQty = Math.min(remaining, buyOrder.remainingShares);
        if (fillQty <= 0) continue;

        const execPrice = buyOrder.priceToman;
        const tradeValue = fillQty * execPrice;
        remaining -= fillQty;
        matchedShares += fillQty;
        totalProceeds += tradeValue;

        const newBuyRem = buyOrder.remainingShares - fillQty;
        await db
          .update(marketOrders)
          .set({
            remainingShares: newBuyRem,
            status: newBuyRem === 0 ? "filled" : "open",
            updatedAt: now,
          })
          .where(eq(marketOrders.id, buyOrder.id));

        if (buyOrder.userId !== "market-maker-pool") {
          const buyerHolding = (
            await db
              .select()
              .from(shareHoldings)
              .where(and(eq(shareHoldings.userId, buyOrder.userId), eq(shareHoldings.projectSlug, projectSlug)))
              .limit(1)
          )[0];
          if (buyerHolding) {
            await db
              .update(shareHoldings)
              .set({ shares: buyerHolding.shares + fillQty, updatedAt: now })
              .where(eq(shareHoldings.id, buyerHolding.id));
          } else {
            await db.insert(shareHoldings).values({
              id: crypto.randomUUID(),
              userId: buyOrder.userId,
              projectSlug,
              shares: fillQty,
              lockedShares: 0,
              avgPriceToman: execPrice,
              updatedAt: now,
            });
          }
        }

        await db.insert(marketTrades).values({
          id: crypto.randomUUID(),
          projectSlug,
          buyOrderId: buyOrder.id,
          sellOrderId: orderId,
          buyerId: buyOrder.userId,
          sellerId: actor.userId,
          shares: fillQty,
          priceToman: execPrice,
          totalToman: tradeValue,
          kind: "secondary",
          createdAt: now,
        });
      }

      const updatedHolding = (
        await db.select().from(shareHoldings).where(eq(shareHoldings.id, holding.id)).limit(1)
      )[0];
      if (updatedHolding && matchedShares > 0) {
        await db
          .update(shareHoldings)
          .set({
            lockedShares: Math.max(0, updatedHolding.lockedShares - matchedShares),
            updatedAt: now,
          })
          .where(eq(shareHoldings.id, holding.id));
      }

      if (totalProceeds > 0) {
        const freshWallet = await ensureWallet(actor.userId);
        await db
          .update(userWallets)
          .set({ balanceToman: freshWallet.balanceToman + totalProceeds, updatedAt: now })
          .where(eq(userWallets.userId, actor.userId));
      }

      await db.insert(marketOrders).values({
        id: orderId,
        userId: actor.userId,
        userDisplayName: actor.displayName,
        projectSlug,
        side: "sell",
        priceToman,
        initialShares: shares,
        remainingShares: remaining,
        status: remaining === 0 ? "filled" : "open",
        createdAt: now,
        updatedAt: now,
      });

      const msg =
        matchedShares === shares
          ? `سفارش فروش ${shares.toLocaleString("fa-IR")} سهم بلافاصله در بازار ثانویه معامله شد و مبلغ ${totalProceeds.toLocaleString("fa-IR")} تومان به کیف پول شما واریز گردید.`
          : matchedShares > 0
            ? `تعداد ${matchedShares.toLocaleString("fa-IR")} سهم معامله شد (${totalProceeds.toLocaleString("fa-IR")} تومان واریز شد) و ${remaining.toLocaleString("fa-IR")} سهم باقی‌مانده در تابلوی فروش بازار ثانویه قرار گرفت.`
            : `سفارش فروش ${shares.toLocaleString("fa-IR")} سهم با قیمت ${priceToman.toLocaleString("fa-IR")} تومان در تابلوی بازار ثانویه ثبت شد.`;

      return json({ ok: true, orderId, matchedShares, remainingShares: remaining, message: msg }, 201);
    } else {
      const maxEscrow = shares * priceToman;
      if (wallet.balanceToman < maxEscrow) {
        return json(
          {
            error: `موجودی کیف پول (${wallet.balanceToman.toLocaleString("fa-IR")} تومان) برای ثبت سفارش خرید (${maxEscrow.toLocaleString("fa-IR")} تومان) کافی نیست.`,
          },
          400,
        );
      }

      await db
        .update(userWallets)
        .set({ balanceToman: wallet.balanceToman - maxEscrow, updatedAt: now })
        .where(eq(userWallets.userId, actor.userId));

      const orderId = crypto.randomUUID();
      let remaining = shares;
      let matchedShares = 0;
      let actualSpent = 0;

      const candidateSells = (
        await db
          .select()
          .from(marketOrders)
          .where(and(eq(marketOrders.projectSlug, projectSlug), eq(marketOrders.status, "open"), eq(marketOrders.side, "sell")))
      ).sort((a, b) => a.priceToman - b.priceToman || a.createdAt - b.createdAt);

      for (const sellOrder of candidateSells) {
        if (remaining <= 0) break;
        if (sellOrder.priceToman > priceToman) break;
        if (sellOrder.userId === actor.userId) continue;

        const fillQty = Math.min(remaining, sellOrder.remainingShares);
        if (fillQty <= 0) continue;

        const execPrice = sellOrder.priceToman;
        const tradeValue = fillQty * execPrice;
        remaining -= fillQty;
        matchedShares += fillQty;
        actualSpent += tradeValue;

        const newSellRem = sellOrder.remainingShares - fillQty;
        await db
          .update(marketOrders)
          .set({
            remainingShares: newSellRem,
            status: newSellRem === 0 ? "filled" : "open",
            updatedAt: now,
          })
          .where(eq(marketOrders.id, sellOrder.id));

        if (sellOrder.userId !== "market-maker-pool") {
          const sellerHolding = (
            await db
              .select()
              .from(shareHoldings)
              .where(and(eq(shareHoldings.userId, sellOrder.userId), eq(shareHoldings.projectSlug, projectSlug)))
              .limit(1)
          )[0];
          if (sellerHolding) {
            await db
              .update(shareHoldings)
              .set({
                lockedShares: Math.max(0, sellerHolding.lockedShares - fillQty),
                updatedAt: now,
              })
              .where(eq(shareHoldings.id, sellerHolding.id));
          }
          const sellerWallet = await ensureWallet(sellOrder.userId);
          await db
            .update(userWallets)
            .set({ balanceToman: sellerWallet.balanceToman + tradeValue, updatedAt: now })
            .where(eq(userWallets.userId, sellOrder.userId));
        }

        await db.insert(marketTrades).values({
          id: crypto.randomUUID(),
          projectSlug,
          buyOrderId: orderId,
          sellOrderId: sellOrder.id,
          buyerId: actor.userId,
          sellerId: sellOrder.userId,
          shares: fillQty,
          priceToman: execPrice,
          totalToman: tradeValue,
          kind: "secondary",
          createdAt: now,
        });
      }

      if (matchedShares > 0) {
        const buyerHolding = (
          await db
            .select()
            .from(shareHoldings)
            .where(and(eq(shareHoldings.userId, actor.userId), eq(shareHoldings.projectSlug, projectSlug)))
            .limit(1)
        )[0];
        const avgExecPrice = Math.round(actualSpent / matchedShares);
        if (buyerHolding) {
          const prevTot = buyerHolding.shares + buyerHolding.lockedShares;
          const nextAvg = Math.round(
            (prevTot * buyerHolding.avgPriceToman + actualSpent) / Math.max(1, prevTot + matchedShares),
          );
          await db
            .update(shareHoldings)
            .set({
              shares: buyerHolding.shares + matchedShares,
              avgPriceToman: nextAvg,
              updatedAt: now,
            })
            .where(eq(shareHoldings.id, buyerHolding.id));
        } else {
          await db.insert(shareHoldings).values({
            id: crypto.randomUUID(),
            userId: actor.userId,
            projectSlug,
            shares: matchedShares,
            lockedShares: 0,
            avgPriceToman: avgExecPrice,
            updatedAt: now,
          });
        }
      }

      const lockedForRemaining = remaining * priceToman;
      const refund = maxEscrow - actualSpent - lockedForRemaining;
      if (refund > 0) {
        const currentW = await ensureWallet(actor.userId);
        await db
          .update(userWallets)
          .set({ balanceToman: currentW.balanceToman + refund, updatedAt: now })
          .where(eq(userWallets.userId, actor.userId));
      }

      await db.insert(marketOrders).values({
        id: orderId,
        userId: actor.userId,
        userDisplayName: actor.displayName,
        projectSlug,
        side: "buy",
        priceToman,
        initialShares: shares,
        remainingShares: remaining,
        status: remaining === 0 ? "filled" : "open",
        createdAt: now,
        updatedAt: now,
      });

      const msg =
        matchedShares === shares
          ? `سفارش خرید ${shares.toLocaleString("fa-IR")} سهم در بازار ثانویه به ارزش ${actualSpent.toLocaleString("fa-IR")} تومان انجام شد و به پرتفوی شما اضافه گردید.`
          : matchedShares > 0
            ? `تعداد ${matchedShares.toLocaleString("fa-IR")} سهم خریداری شد و ${remaining.toLocaleString("fa-IR")} سهم باقی‌مانده در تابلوی خرید بازار ثانویه ثبت گردید.`
            : `سفارش خرید ${shares.toLocaleString("fa-IR")} سهم با قیمت ${priceToman.toLocaleString("fa-IR")} تومان در تابلوی بازار ثانویه ثبت شد.`;

      return json({ ok: true, orderId, matchedShares, remainingShares: remaining, message: msg }, 201);
    }
  }

  // 4. Instant Fill of a Specific Open Order from Order Book
  if (action === "fill_order") {
    const targetOrderId = String(body.orderId ?? "").trim();
    const fillSharesReq = Number(body.shares ?? 0);
    const targetOrder = (
      await db.select().from(marketOrders).where(eq(marketOrders.id, targetOrderId)).limit(1)
    )[0];

    if (!targetOrder || targetOrder.status !== "open" || targetOrder.remainingShares <= 0) {
      return json({ error: "این سفارش دیگر در تابلو فعال نیست." }, 404);
    }
    if (targetOrder.userId === actor.userId) {
      return json({ error: "نمی‌توانید سفارش خودتان را معامله کنید؛ از گزینهٔ لغو سفارش استفاده کنید." }, 400);
    }

    const fillQty =
      fillSharesReq > 0 ? Math.min(fillSharesReq, targetOrder.remainingShares) : targetOrder.remainingShares;
    const execPrice = targetOrder.priceToman;
    const totalValue = fillQty * execPrice;
    const projectSlug = targetOrder.projectSlug;

    if (targetOrder.side === "sell") {
      if (wallet.balanceToman < totalValue) {
        return json(
          {
            error: `موجودی کیف پول (${wallet.balanceToman.toLocaleString("fa-IR")} تومان) برای خرید این بسته (${totalValue.toLocaleString("fa-IR")} تومان) کافی نیست.`,
          },
          400,
        );
      }

      await db
        .update(userWallets)
        .set({ balanceToman: wallet.balanceToman - totalValue, updatedAt: now })
        .where(eq(userWallets.userId, actor.userId));

      const newRem = targetOrder.remainingShares - fillQty;
      await db
        .update(marketOrders)
        .set({ remainingShares: newRem, status: newRem === 0 ? "filled" : "open", updatedAt: now })
        .where(eq(marketOrders.id, targetOrder.id));

      if (targetOrder.userId !== "market-maker-pool") {
        const sellerH = (
          await db
            .select()
            .from(shareHoldings)
            .where(and(eq(shareHoldings.userId, targetOrder.userId), eq(shareHoldings.projectSlug, projectSlug)))
            .limit(1)
          )[0];
        if (sellerH) {
          await db
            .update(shareHoldings)
            .set({ lockedShares: Math.max(0, sellerH.lockedShares - fillQty), updatedAt: now })
            .where(eq(shareHoldings.id, sellerH.id));
        }
        const sellerW = await ensureWallet(targetOrder.userId);
        await db
          .update(userWallets)
          .set({ balanceToman: sellerW.balanceToman + totalValue, updatedAt: now })
          .where(eq(userWallets.userId, targetOrder.userId));
      }

      const buyerH = (
        await db
          .select()
          .from(shareHoldings)
          .where(and(eq(shareHoldings.userId, actor.userId), eq(shareHoldings.projectSlug, projectSlug)))
          .limit(1)
      )[0];
      if (buyerH) {
        const prevTot = buyerH.shares + buyerH.lockedShares;
        const nextAvg = Math.round((prevTot * buyerH.avgPriceToman + totalValue) / Math.max(1, prevTot + fillQty));
        await db
          .update(shareHoldings)
          .set({ shares: buyerH.shares + fillQty, avgPriceToman: nextAvg, updatedAt: now })
          .where(eq(shareHoldings.id, buyerH.id));
      } else {
        await db.insert(shareHoldings).values({
          id: crypto.randomUUID(),
          userId: actor.userId,
          projectSlug,
          shares: fillQty,
          lockedShares: 0,
          avgPriceToman: execPrice,
          updatedAt: now,
        });
      }

      await db.insert(marketTrades).values({
        id: crypto.randomUUID(),
        projectSlug,
        buyOrderId: null,
        sellOrderId: targetOrder.id,
        buyerId: actor.userId,
        sellerId: targetOrder.userId,
        shares: fillQty,
        priceToman: execPrice,
        totalToman: totalValue,
        kind: "secondary",
        createdAt: now,
      });

      return json({
        ok: true,
        message: `خرید آنی ${fillQty.toLocaleString("fa-IR")} سهم به مبلغ ${totalValue.toLocaleString("fa-IR")} تومان از بازار ثانویه انجام شد.`,
      });
    } else {
      const sellerH = (
        await db
          .select()
          .from(shareHoldings)
          .where(and(eq(shareHoldings.userId, actor.userId), eq(shareHoldings.projectSlug, projectSlug)))
          .limit(1)
      )[0];
      if (!sellerH || sellerH.shares < fillQty) {
        return json(
          {
            error: `سهام آزاد شما در این پروژه (${(sellerH?.shares ?? 0).toLocaleString("fa-IR")} سهم) برای فروش به این سفارش کافی نیست.`,
          },
          400,
        );
      }

      await db
        .update(shareHoldings)
        .set({ shares: sellerH.shares - fillQty, updatedAt: now })
        .where(eq(shareHoldings.id, sellerH.id));

      await db
        .update(userWallets)
        .set({ balanceToman: wallet.balanceToman + totalValue, updatedAt: now })
        .where(eq(userWallets.userId, actor.userId));

      const newRem = targetOrder.remainingShares - fillQty;
      await db
        .update(marketOrders)
        .set({ remainingShares: newRem, status: newRem === 0 ? "filled" : "open", updatedAt: now })
        .where(eq(marketOrders.id, targetOrder.id));

      if (targetOrder.userId !== "market-maker-pool") {
        const buyerH = (
          await db
            .select()
            .from(shareHoldings)
            .where(and(eq(shareHoldings.userId, targetOrder.userId), eq(shareHoldings.projectSlug, projectSlug)))
            .limit(1)
        )[0];
        if (buyerH) {
          await db
            .update(shareHoldings)
            .set({ shares: buyerH.shares + fillQty, updatedAt: now })
            .where(eq(shareHoldings.id, buyerH.id));
        } else {
          await db.insert(shareHoldings).values({
            id: crypto.randomUUID(),
            userId: targetOrder.userId,
            projectSlug,
            shares: fillQty,
            lockedShares: 0,
            avgPriceToman: execPrice,
            updatedAt: now,
          });
        }
      }

      await db.insert(marketTrades).values({
        id: crypto.randomUUID(),
        projectSlug,
        buyOrderId: targetOrder.id,
        sellOrderId: null,
        buyerId: targetOrder.userId,
        sellerId: actor.userId,
        shares: fillQty,
        priceToman: execPrice,
        totalToman: totalValue,
        kind: "secondary",
        createdAt: now,
      });

      return json({
        ok: true,
        message: `فروش آنی ${fillQty.toLocaleString("fa-IR")} سهم انجام شد و مبلغ ${totalValue.toLocaleString("fa-IR")} تومان به کیف پول شما واریز گردید.`,
      });
    }
  }

  return json({ error: "عملیات نامعتبر است." }, 400);
}

export async function DELETE(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود لازم است." }, 401);

  const orderId = new URL(request.url).searchParams.get("id");
  if (!orderId) return json({ error: "شناسهٔ سفارش مشخص نشده است." }, 400);

  const db = getDb();
  const order = (await db.select().from(marketOrders).where(eq(marketOrders.id, orderId)).limit(1))[0];
  if (!order || order.userId !== actor.userId) {
    return json({ error: "سفارش یافت نشد." }, 404);
  }
  if (order.status !== "open" || order.remainingShares <= 0) {
    return json({ error: "این سفارش قبلاً انجام یا لغو شده است." }, 409);
  }

  const now = Date.now();
  await db
    .update(marketOrders)
    .set({ status: "cancelled", remainingShares: 0, updatedAt: now })
    .where(eq(marketOrders.id, order.id));

  if (order.side === "sell") {
    const holding = (
      await db
        .select()
        .from(shareHoldings)
        .where(and(eq(shareHoldings.userId, actor.userId), eq(shareHoldings.projectSlug, order.projectSlug)))
        .limit(1)
    )[0];
    if (holding) {
      await db
        .update(shareHoldings)
        .set({
          shares: holding.shares + order.remainingShares,
          lockedShares: Math.max(0, holding.lockedShares - order.remainingShares),
          updatedAt: now,
        })
        .where(eq(shareHoldings.id, holding.id));
    }
  } else {
    const refund = order.remainingShares * order.priceToman;
    const wallet = await ensureWallet(actor.userId);
    await db
      .update(userWallets)
      .set({ balanceToman: wallet.balanceToman + refund, updatedAt: now })
      .where(eq(userWallets.userId, actor.userId));
  }

  return json({
    ok: true,
    message: "سفارش باز شما لغو شد و موجودی مسدودشده به حساب شما بازگشت.",
  });
}
