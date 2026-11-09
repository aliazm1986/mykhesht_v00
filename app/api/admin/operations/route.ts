import { and, desc, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import {
  auditEvents,
  backupSnapshots,
  localAccounts,
  localSessions,
  maintenanceRuns,
  marketOrders,
  marketTrades,
  memberDetails,
  notifications,
  projectCases,
  projectMemberships,
  shareHoldings,
  supportTickets,
  ticketReplies,
  userProfiles,
  userWallets,
} from "@/db/schema";
import { appRoles, auditQuery, getCurrentActor, type AppRole } from "@/lib/control";
import { localAuthEnabled, newSessionToken, passwordHash, sessionCookie, sessionHash } from "@/lib/local-auth";
import { properties, resolveTierByInvestment, tiers, type InvestorTier } from "@/lib/data";

export const dynamic = "force-dynamic";

const json = (v: unknown, status = 200, extraHeaders?: Record<string, string>) =>
  Response.json(v, {
    status,
    headers: { "cache-control": "no-store", ...(extraHeaders ?? {}) },
  });

async function seedDemoMultiUsersIfNeeded() {
  const db = getDb();
  const existingUsers = await db.select().from(userProfiles);
  if (existingUsers.length >= 4) return;

  const now = Date.now();
  const demoPasswordHash = await passwordHash("Khesht1405!");

  const demoUsers = [
    {
      userId: "demo-user-sara",
      email: "sara.mohammadi@khesht.ir",
      displayName: "سارا محمدی",
      firstName: "سارا",
      lastName: "محمدی",
      mobile: "09121112233",
      role: "investor",
      tierId: "gold" as InvestorTier,
      walletBalance: 340_000_000,
      holdings: [
        { slug: "niavaran-flip", shares: 45, price: 560_000 },
        { slug: "narvan-renovation", shares: 60, price: 525_000 },
      ],
    },
    {
      userId: "demo-user-amir",
      email: "amir.kazemi@khesht.ir",
      displayName: "امیرحسین کاظمی",
      firstName: "امیرحسین",
      lastName: "کاظمی",
      mobile: "09123334455",
      role: "investor",
      tierId: "titanium" as InvestorTier,
      walletBalance: 820_000_000,
      holdings: [
        { slug: "shahrak-west", shares: 110, price: 545_000 },
        { slug: "mirdamad-office", shares: 85, price: 1_085_000 },
        { slug: "kish-marina", shares: 40, price: 790_000 },
      ],
    },
    {
      userId: "demo-user-nima",
      email: "nima.alavi@khesht.ir",
      displayName: "نیما علوی",
      firstName: "نیما",
      lastName: "علوی",
      mobile: "09125556677",
      role: "expert",
      tierId: "silver" as InvestorTier,
      walletBalance: 195_000_000,
      holdings: [{ slug: "lavasan-garden", shares: 30, price: 675_000 }],
    },
  ];

  for (const u of demoUsers) {
    if (existingUsers.some((x) => x.userId === u.userId || x.email === u.email)) continue;
    await db
      .insert(userProfiles)
      .values({
        userId: u.userId,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        createdAt: now - 86400_000 * 5,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: userProfiles.userId });

    await db
      .insert(localAccounts)
      .values({
        userId: u.userId,
        email: u.email,
        passwordHash: demoPasswordHash,
        active: 1,
        createdAt: now - 86400_000 * 5,
      })
      .onConflictDoNothing({ target: localAccounts.userId });

    await db
      .insert(memberDetails)
      .values({
        userId: u.userId,
        firstName: u.firstName,
        lastName: u.lastName,
        mobile: u.mobile,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: memberDetails.userId });

    await db
      .insert(userWallets)
      .values({
        userId: u.userId,
        balanceToman: u.walletBalance,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: userWallets.userId });

    for (const h of u.holdings) {
      await db
        .insert(shareHoldings)
        .values({
          id: `seed-hold-${u.userId}-${h.slug}`,
          userId: u.userId,
          projectSlug: h.slug,
          shares: h.shares,
          lockedShares: 0,
          avgPriceToman: h.price,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: shareHoldings.id });
    }
  }
}

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود لازم است." }, 401);
  if (actor.role !== "admin") return json({ error: "فقط مدیر دسترسی دارد." }, 403);

  if (localAuthEnabled()) {
    await seedDemoMultiUsersIfNeeded();
  }

  const db = getDb();
  const [
    usersRows,
    accountsRows,
    detailsRows,
    walletsRows,
    holdingsRows,
    ordersRows,
    tradesRows,
    ticketsRows,
    repliesRows,
    logs,
    cases,
    backups,
    maintenance,
  ] = await Promise.all([
    db.select().from(userProfiles).orderBy(desc(userProfiles.updatedAt)),
    db.select().from(localAccounts),
    db.select().from(memberDetails),
    db.select().from(userWallets),
    db.select().from(shareHoldings),
    db.select().from(marketOrders).orderBy(desc(marketOrders.createdAt)).limit(100),
    db.select().from(marketTrades).orderBy(desc(marketTrades.createdAt)).limit(100),
    db.select().from(supportTickets).orderBy(desc(supportTickets.updatedAt)).limit(50),
    db.select().from(ticketReplies).orderBy(desc(ticketReplies.createdAt)).limit(200),
    db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(200),
    db.select().from(projectCases),
    db.select().from(backupSnapshots).orderBy(desc(backupSnapshots.createdAt)).limit(30),
    db.select().from(maintenanceRuns).orderBy(desc(maintenanceRuns.startedAt)).limit(30),
  ]);

  // Resolve saved tiers from auditEvents
  const tierMap = new Map<string, InvestorTier>();
  for (const ev of logs) {
    if (ev.targetType === "user_tier" && !tierMap.has(ev.targetId)) {
      try {
        const p = JSON.parse(ev.payloadJson) as { tierId?: InvestorTier };
        if (p.tierId) tierMap.set(ev.targetId, p.tierId);
      } catch {
        // ignore
      }
    }
  }

  const enrichedUsers = usersRows.map((u) => {
    const acc = accountsRows.find((a) => a.userId === u.userId);
    const det = detailsRows.find((d) => d.userId === u.userId);
    const wal = walletsRows.find((w) => w.userId === u.userId);
    const userHolds = holdingsRows.filter((h) => h.userId === u.userId && (h.shares > 0 || h.lockedShares > 0));
    const userOrders = ordersRows.filter((o) => o.userId === u.userId && o.status === "open");

    const totalSharesOwned = userHolds.reduce((s, h) => s + h.shares + h.lockedShares, 0);
    const portfolioValueToman = userHolds.reduce((s, h) => {
      const p = properties.find((item) => item.slug === h.projectSlug);
      const price = p?.tokenPriceCurrent ?? h.avgPriceToman ?? 500_000;
      return s + (h.shares + h.lockedShares) * price;
    }, 0);

    const resolvedTier = resolveTierByInvestment(portfolioValueToman, tierMap.get(u.userId));

    return {
      userId: u.userId,
      displayName: u.displayName,
      email: u.email,
      role: u.role,
      mobile: det?.mobile ?? "",
      active: acc ? acc.active === 1 : true,
      walletBalanceToman: wal?.balanceToman ?? 500_000_000,
      portfolioValueToman,
      totalSharesOwned,
      holdingsCount: userHolds.length,
      openOrdersCount: userOrders.length,
      tierId: resolvedTier.id,
      tierName: resolvedTier.name,
      tierColor: resolvedTier.color,
      holdings: userHolds.map((h) => ({
        projectSlug: h.projectSlug,
        projectName: properties.find((p) => p.slug === h.projectSlug)?.name ?? h.projectSlug,
        shares: h.shares,
        lockedShares: h.lockedShares,
        avgPriceToman: h.avgPriceToman,
      })),
    };
  });

  const enrichedTickets = ticketsRows.map((t) => {
    const owner = usersRows.find((u) => u.userId === t.ownerId);
    const tReplies = repliesRows.filter((r) => r.ticketId === t.id);
    return {
      ...t,
      ownerName: owner?.displayName ?? t.ownerId,
      ownerEmail: owner?.email ?? "",
      replies: tReplies,
    };
  });

  const totalWalletsToman = enrichedUsers.reduce((s, u) => s + u.walletBalanceToman, 0);
  const totalPortfolioToman = enrichedUsers.reduce((s, u) => s + u.portfolioValueToman, 0);
  const totalSharesIssued = enrichedUsers.reduce((s, u) => s + u.totalSharesOwned, 0);

  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  let storageReady = false;
  try {
    if (bucket) {
      await bucket.list({ limit: 1 });
      storageReady = true;
    }
  } catch {
    // ignore
  }

  return json({
    users: enrichedUsers,
    marketSummary: {
      totalUsers: enrichedUsers.length,
      totalWalletsToman,
      totalPortfolioToman,
      totalSharesIssued,
      openOrdersCount: ordersRows.filter((o) => o.status === "open").length,
      totalTradesCount: tradesRows.length,
      openOrders: ordersRows.filter((o) => o.status === "open"),
      recentTrades: tradesRows.slice(0, 30),
    },
    tickets: enrichedTickets,
    logs,
    cases,
    maintenance,
    backups: backups.map(({ storageKey: _key, ...r }) => r),
    health: {
      database: "ok",
      storage: storageReady ? "ok" : "unavailable",
      checkedAt: Date.now(),
      mode: "private_pilot",
      paymentsEnabled: false,
      tokenIssuanceEnabled: false,
    },
  });
}

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor) return json({ error: "ورود لازم است." }, 401);
  if (actor.role !== "admin") return json({ error: "فقط مدیر دسترسی دارد." }, 403);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") {
    return json({ error: "نوع عملیات مدیریتی مشخص نشده است." }, 400);
  }

  const db = getDb();
  const now = Date.now();
  const action = body.action;

  // 1. Create a New User Account (Multi-User Support)
  if (action === "create_user") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? "").trim();
    const mobile = String(body.mobile ?? "").trim();
    const password = String(body.password ?? "Khesht1405!");
    const role = (appRoles as readonly string[]).includes(String(body.role))
      ? (String(body.role) as AppRole)
      : "investor";
    const tierId = (["bronze", "silver", "gold", "titanium"].includes(String(body.tierId))
      ? String(body.tierId)
      : "bronze") as InvestorTier;
    const initialBalanceToman = Math.max(0, Number(body.initialBalanceToman ?? 500_000_000));

    if (!email || !email.includes("@") || displayName.length < 2) {
      return json({ error: "نام و ایمیل معتبر برای کاربر جدید وارد کنید." }, 400);
    }
    if (password.length < 6) {
      return json({ error: "گذرواژه باید حداقل ۶ نویسه باشد." }, 400);
    }

    const existing = (await db.select().from(localAccounts).where(eq(localAccounts.email, email)).limit(1))[0];
    if (existing) {
      return json({ error: "کاربری با این ایمیل قبلاً ثبت شده است." }, 409);
    }

    const userId = `user-${crypto.randomUUID().slice(0, 12)}`;
    const pwHash = await passwordHash(password);
    const nameParts = displayName.split(/\s+/);
    const firstName = nameParts[0] || displayName;
    const lastName = nameParts.slice(1).join(" ");

    const queries = [
      db.insert(localAccounts).values({
        userId,
        email,
        passwordHash: pwHash,
        active: 1,
        createdAt: now,
      }),
      db.insert(userProfiles).values({
        userId,
        email,
        displayName,
        role,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(memberDetails).values({
        userId,
        firstName,
        lastName,
        mobile,
        updatedAt: now,
      }),
      db.insert(userWallets).values({
        userId,
        balanceToman: initialBalanceToman,
        updatedAt: now,
      }),
      auditQuery({
        actorId: actor.userId,
        action: "member.tier_updated",
        targetType: "user_tier",
        targetId: userId,
        payload: { tierId },
      }),
      ...properties.map((p) =>
        db
          .insert(projectMemberships)
          .values({
            id: crypto.randomUUID(),
            projectSlug: p.slug,
            userId,
            role: role === "admin" ? "project_manager" : "investor",
            active: 1,
            updatedBy: actor.userId,
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing(),
      ),
    ];

    await db.batch(queries as [typeof queries[0], ...typeof queries]);

    return json(
      {
        ok: true,
        userId,
        message: `حساب کاربری «${displayName}» (${email}) با موجودی ${initialBalanceToman.toLocaleString("fa-IR")} تومان ساخته و فعال شد.`,
      },
      201,
    );
  }

  // 2. Update User Role, Tier, Wallet Balance, or Active Status
  if (action === "update_user") {
    const userId = String(body.userId ?? "").trim();
    if (!userId) return json({ error: "شناسهٔ کاربر مشخص نشده است." }, 400);

    const targetProfile = (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
    if (!targetProfile) return json({ error: "کاربر یافت نشد." }, 404);

    const nextRole = (appRoles as readonly string[]).includes(String(body.role))
      ? (String(body.role) as AppRole)
      : (targetProfile.role as AppRole);
    const nextDisplayName =
      typeof body.displayName === "string" && body.displayName.trim().length >= 2
        ? body.displayName.trim()
        : targetProfile.displayName;
    const nextWalletBalance =
      typeof body.walletBalanceToman === "number" && Number.isSafeInteger(body.walletBalanceToman) && body.walletBalanceToman >= 0
        ? body.walletBalanceToman
        : null;
    const nextTierId = ["bronze", "silver", "gold", "titanium"].includes(String(body.tierId))
      ? (String(body.tierId) as InvestorTier)
      : null;
    const nextActive = typeof body.active === "boolean" ? (body.active ? 1 : 0) : null;

    await db
      .update(userProfiles)
      .set({ role: nextRole, displayName: nextDisplayName, updatedAt: now })
      .where(eq(userProfiles.userId, userId));

    if (nextActive !== null) {
      await db.update(localAccounts).set({ active: nextActive }).where(eq(localAccounts.userId, userId));
    }

    if (nextWalletBalance !== null) {
      await db
        .insert(userWallets)
        .values({ userId, balanceToman: nextWalletBalance, updatedAt: now })
        .onConflictDoUpdate({
          target: userWallets.userId,
          set: { balanceToman: nextWalletBalance, updatedAt: now },
        });
    }

    if (nextTierId) {
      const tierObj = tiers.find((t) => t.id === nextTierId);
      await db.batch([
        auditQuery({
          actorId: actor.userId,
          action: "member.tier_updated",
          targetType: "user_tier",
          targetId: userId,
          payload: { tierId: nextTierId, tierName: tierObj?.name },
        }),
        db.insert(notifications).values({
          id: crypto.randomUUID(),
          ownerId: userId,
          title: `بروزرسانی سطح کاربری به «سطح ${tierObj?.name ?? nextTierId}»`,
          body: `سطح کاربری شما توسط مدیریت سامانه به «${tierObj?.name ?? nextTierId}» ارتقا یافت.`,
          href: "/tiers",
          readAt: null,
          createdAt: now,
        }),
      ]);
    }

    return json({
      ok: true,
      message: `اطلاعات حساب، موجودی کیف پول و سطح کاربری «${nextDisplayName}» با موفقیت بروزرسانی شد.`,
    });
  }

  // 3. Allocate Shares of a Project to Any User
  if (action === "allocate_shares") {
    const userId = String(body.userId ?? "").trim();
    const projectSlug = String(body.projectSlug ?? "").trim();
    const shares = Number(body.shares ?? 0);

    if (!userId || !projectSlug || !Number.isSafeInteger(shares) || shares < 1) {
      return json({ error: "کاربر، پروژه و تعداد سهام (حداقل ۱ سهم) را مشخص کنید." }, 400);
    }

    const proj = properties.find((p) => p.slug === projectSlug) ?? properties[0];
    const unitPrice = proj?.tokenPriceCurrent || 500_000;

    const existing = (
      await db
        .select()
        .from(shareHoldings)
        .where(and(eq(shareHoldings.userId, userId), eq(shareHoldings.projectSlug, projectSlug)))
        .limit(1)
    )[0];

    if (existing) {
      await db
        .update(shareHoldings)
        .set({ shares: existing.shares + shares, updatedAt: now })
        .where(eq(shareHoldings.id, existing.id));
    } else {
      await db.insert(shareHoldings).values({
        id: crypto.randomUUID(),
        userId,
        projectSlug,
        shares,
        lockedShares: 0,
        avgPriceToman: unitPrice,
        updatedAt: now,
      });
    }

    await db.batch([
      db.insert(marketTrades).values({
        id: crypto.randomUUID(),
        projectSlug,
        buyOrderId: null,
        sellOrderId: null,
        buyerId: userId,
        sellerId: "admin-allocation",
        shares,
        priceToman: unitPrice,
        totalToman: shares * unitPrice,
        kind: "primary",
        createdAt: now,
      }),
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        ownerId: userId,
        title: `تخصیص ${shares.toLocaleString("fa-IR")} سهم از «${proj?.name ?? projectSlug}»`,
        body: `تعداد ${shares.toLocaleString("fa-IR")} سهم توسط مدیریت سامانه به پرتفوی شما اضافه گردید.`,
        href: "/dashboard",
        readAt: null,
        createdAt: now,
      }),
    ]);

    return json({
      ok: true,
      message: `${shares.toLocaleString("fa-IR")} سهم از پروژهٔ «${proj?.name ?? projectSlug}» به پرتفوی کاربر اضافه شد.`,
    });
  }

  // 4. Distribute Periodic Rental Dividend to All Shareholders of Rental Projects
  if (action === "distribute_rental") {
    const targetSlug = String(body.projectSlug ?? "all").trim();
    const allHoldings = await db.select().from(shareHoldings);
    let distributedCount = 0;
    let totalDistributedToman = 0;

    for (const h of allHoldings) {
      const totShares = h.shares + h.lockedShares;
      if (totShares <= 0) continue;
      if (targetSlug !== "all" && h.projectSlug !== targetSlug) continue;
      const p = properties.find((item) => item.slug === h.projectSlug);
      if (!p || (p.investmentModel !== "rent" && (p.rentalYield ?? 0) <= 0)) continue;

      const yieldPct = p.rentalYield || 11;
      const marketVal = totShares * (p.tokenPriceCurrent || 525_000);
      const payout = Math.max(25_000, Math.round((marketVal * (yieldPct / 100)) / 12));

      distributedCount++;
      totalDistributedToman += payout;

      await db.batch([
        auditQuery({
          actorId: h.userId,
          action: "wallet.rental_claim",
          targetType: "rental_wallet",
          targetId: h.userId,
          payload: { amountToman: payout, projectSlug: p.slug, distributedByAdmin: actor.userId },
        }),
        db.insert(notifications).values({
          id: crypto.randomUUID(),
          ownerId: h.userId,
          title: `واریز سود اجارهٔ «${p.name}» به کیف پول اجاره (${payout.toLocaleString("fa-IR")} تومان)`,
          body: `سود اجارهٔ دورهٔ جاری بابت ${totShares.toLocaleString("fa-IR")} سهم به مبلغ ${payout.toLocaleString("fa-IR")} تومان در کیف پول اجارهٔ شما ثبت شد.`,
          href: "/dashboard",
          readAt: null,
          createdAt: now,
        }),
      ]);
    }

    return json({
      ok: true,
      message: `سود اجارهٔ دوره به مبلغ کل ${totalDistributedToman.toLocaleString("fa-IR")} تومان به کیف پول اجارهٔ ${distributedCount.toLocaleString("fa-IR")} سهام‌دار واریز گردید.`,
    });
  }

  // 5. Admin Cancel Secondary Market Order
  if (action === "cancel_order") {
    const orderId = String(body.orderId ?? "").trim();
    const ord = (await db.select().from(marketOrders).where(eq(marketOrders.id, orderId)).limit(1))[0];
    if (!ord || ord.status !== "open") {
      return json({ error: "سفارش فعال یافت نشد." }, 404);
    }

    await db
      .update(marketOrders)
      .set({ status: "cancelled", remainingShares: 0, updatedAt: now })
      .where(eq(marketOrders.id, ord.id));

    if (ord.userId !== "market-maker-pool") {
      if (ord.side === "sell") {
        const h = (
          await db
            .select()
            .from(shareHoldings)
            .where(and(eq(shareHoldings.userId, ord.userId), eq(shareHoldings.projectSlug, ord.projectSlug)))
            .limit(1)
        )[0];
        if (h) {
          await db
            .update(shareHoldings)
            .set({
              shares: h.shares + ord.remainingShares,
              lockedShares: Math.max(0, h.lockedShares - ord.remainingShares),
              updatedAt: now,
            })
            .where(eq(shareHoldings.id, h.id));
        }
      } else {
        const refund = ord.remainingShares * ord.priceToman;
        const w = (await db.select().from(userWallets).where(eq(userWallets.userId, ord.userId)).limit(1))[0];
        if (w) {
          await db
            .update(userWallets)
            .set({ balanceToman: w.balanceToman + refund, updatedAt: now })
            .where(eq(userWallets.userId, ord.userId));
        }
      }
    }

    return json({ ok: true, message: "سفارش انتخاب‌شده لغو شد و دارایی به حساب کاربر بازگشت." });
  }

  // 6. Reply to or Close a Support Ticket from Admin Panel
  if (action === "reply_ticket") {
    const ticketId = String(body.ticketId ?? "").trim();
    const replyMessage = String(body.message ?? "").trim();
    const nextStatus = String(body.status ?? "answered");
    if (!ticketId || replyMessage.length < 2) {
      return json({ error: "متن پاسخ را وارد کنید." }, 400);
    }

    const ticket = (await db.select().from(supportTickets).where(eq(supportTickets.id, ticketId)).limit(1))[0];
    if (!ticket) return json({ error: "تیکت یافت نشد." }, 404);

    await db.batch([
      db.insert(ticketReplies).values({
        id: crypto.randomUUID(),
        ticketId,
        authorId: actor.userId,
        authorName: `${actor.displayName} (مدیریت خشت)`,
        message: replyMessage,
        createdAt: now,
      }),
      db
        .update(supportTickets)
        .set({ status: nextStatus, updatedAt: now })
        .where(eq(supportTickets.id, ticketId)),
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        ownerId: ticket.ownerId,
        title: `پاسخ مدیریت به تیکت «${ticket.subject}»`,
        body: replyMessage.slice(0, 160),
        href: "/support",
        readAt: null,
        createdAt: now,
      }),
    ]);

    return json({ ok: true, message: "پاسخ مدیریت ثبت شد و برای کاربر اعلان ارسال گردید." });
  }

  // 7. Quick Switch User Session (For Multi-User Testing)
  if (action === "switch_user") {
    const targetUserId = String(body.userId ?? "").trim();
    const targetUser = (await db.select().from(userProfiles).where(eq(userProfiles.userId, targetUserId)).limit(1))[0];
    if (!targetUser) return json({ error: "کاربر مورد نظر یافت نشد." }, 404);

    // Ensure localAccount row exists so localUser() can resolve the session
    const acc = (await db.select().from(localAccounts).where(eq(localAccounts.userId, targetUserId)).limit(1))[0];
    if (!acc) {
      await db.insert(localAccounts).values({
        userId: targetUser.userId,
        email: targetUser.email,
        passwordHash: await passwordHash("Khesht1405!"),
        active: 1,
        createdAt: now,
      });
    }

    const rawToken = newSessionToken();
    const hashed = await sessionHash(rawToken);
    const expiresAt = now + 7 * 24 * 3600_000;

    await db.insert(localSessions).values({
      tokenHash: hashed,
      userId: targetUser.userId,
      expiresAt,
    });

    const cookieHeader = `${sessionCookie}=${rawToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`;
    return json(
      {
        ok: true,
        message: `نشست فعال به حساب «${targetUser.displayName}» (${targetUser.email}) تغییر یافت.`,
      },
      200,
      { "set-cookie": cookieHeader },
    );
  }

  return json({ error: "عملیات نامعتبر است." }, 400);
}
