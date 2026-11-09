'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Award,
  ArrowDownUp,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Coins,
  KeyRound,
  Layers3,
  LineChart,
  PlusCircle,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Wallet,
  XCircle,
} from 'lucide-react';
import { properties as defaultCatalogProjects, getProjectCategoryBadge, resolveTierByInvestment, tiers } from '@/lib/data';
import { readJson } from '@/lib/api-client';

type HoldingItem = {
  id: string;
  projectSlug: string;
  shares: number;
  lockedShares: number;
  avgPriceToman: number;
};

type OrderItem = {
  id: string;
  projectSlug: string;
  side: 'buy' | 'sell';
  priceToman: number;
  initialShares: number;
  remainingShares: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: number;
};

type TradeItem = {
  id: string;
  projectSlug: string;
  buyerId: string;
  sellerId: string;
  shares: number;
  priceToman: number;
  totalToman: number;
  kind: 'primary' | 'secondary';
  createdAt: number;
};

type MarketProject = {
  slug: string;
  name: string;
  location: string;
  investmentModel?: 'hold' | 'flip' | 'rent';
  type?: string;
  tokenSymbol: string;
  tokenPriceInitial: number;
  tokenPriceCurrent: number;
  estimatedReturnBase: number;
  rentalYield: number;
};

type RentalBreakdownItem = {
  projectSlug: string;
  projectName: string;
  tokenSymbol: string;
  shares: number;
  rentalYield: number;
  monthlyRentToman: number;
  accruedRentToman: number;
};

type RentalWalletInfo = {
  balanceToman: number;
  totalEarnedRentalToman: number;
  transferredToMainToman: number;
  breakdown: RentalBreakdownItem[];
};

type MemberProfile = {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  role: string;
  tier?: string;
  tierId?: string;
  tierName?: string;
  tierColor?: string;
  tierAccess?: string;
  feeDiscountPercent?: number;
  nextTierName?: string | null;
  nextTierMinToman?: number | null;
  tierProgressPercent?: number;
};

type InitialSummary = {
  actor: { userId: string; displayName: string; email: string; role: string };
  walletBalanceToman: number;
  portfolioValueToman: number;
  openOrdersCount: number;
  records: Array<{
    slug: string;
    name: string;
    location: string;
    tokenSymbol: string;
    shares: number;
    lockedShares: number;
    avgPriceToman: number;
    currentPriceToman: number;
    marketValueToman: number;
    stage: string;
    last: string;
    status: string;
  }>;
  runs: Array<{ id: string; projectSlug: string; name: string; createdAt: number }>;
  scenarios: Array<{ id: string; name: string; virtualBudget: number; horizonMonths: number; updatedAt: number }>;
} | null;

const fmt = (v: number) => Math.round(v).toLocaleString('fa-IR');

export function UserDashboardClient({ initialSummary }: { initialSummary: InitialSummary }) {
  const initialCatalogProjects: MarketProject[] = useMemo(
    () =>
      defaultCatalogProjects.map((p) => ({
        slug: p.slug,
        name: p.name,
        location: p.location,
        investmentModel: p.investmentModel,
        type: p.type,
        tokenSymbol: p.tokenSymbol,
        tokenPriceInitial: p.tokenPriceInitial,
        tokenPriceCurrent: p.tokenPriceCurrent,
        estimatedReturnBase: p.estimatedReturnBase,
        rentalYield: p.rentalYield,
      })),
    [],
  );

  const initialHoldingsFromSummary: HoldingItem[] = useMemo(
    () =>
      (initialSummary?.records ?? [])
        .filter((r) => (r.shares ?? 0) > 0 || (r.lockedShares ?? 0) > 0)
        .map((r) => ({
          id: `init-${r.slug}`,
          projectSlug: r.slug,
          shares: r.shares ?? 0,
          lockedShares: r.lockedShares ?? 0,
          avgPriceToman: r.avgPriceToman ?? r.currentPriceToman ?? 500_000,
        })),
    [initialSummary],
  );

  const [profile, setProfile] = useState<MemberProfile | null>(
    initialSummary
      ? {
          firstName: initialSummary.actor.displayName,
          lastName: '',
          mobile: '',
          email: initialSummary.actor.email,
          role: initialSummary.actor.role,
          tier: 'سرمایه‌گذار فعال',
        }
      : null,
  );
  const [walletBalance, setWalletBalance] = useState(initialSummary?.walletBalanceToman ?? 500_000_000);
  const [rentalWallet, setRentalWallet] = useState<RentalWalletInfo>({
    balanceToman: 0,
    totalEarnedRentalToman: 0,
    transferredToMainToman: 0,
    breakdown: [],
  });
  const [projects, setProjects] = useState<MarketProject[]>(initialCatalogProjects);
  const [holdings, setHoldings] = useState<HoldingItem[]>(initialHoldingsFromSummary);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([]);
  const [quickProject, setQuickProject] = useState(initialCatalogProjects[0]?.slug ?? 'niavaran-flip');
  const [quickShares, setQuickShares] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadLiveDashboard = useCallback(async () => {
    if (!initialSummary) return;
    try {
      const [mRes, pRes] = await Promise.all([
        fetch('/api/market', { cache: 'no-store' }),
        fetch('/api/member', { cache: 'no-store' }),
      ]);
      if (mRes.ok) {
        const d = await readJson<{
          wallet: { balanceToman: number; rentalBalanceToman?: number };
          rentalWallet?: RentalWalletInfo;
          projects: MarketProject[];
          holdings: HoldingItem[];
          myOrders: OrderItem[];
          recentTrades: TradeItem[];
        }>(mRes);
        setWalletBalance(d.wallet.balanceToman);
        if (d.rentalWallet) {
          setRentalWallet(d.rentalWallet);
        }
        if (d.projects && d.projects.length > 0) {
          setProjects(d.projects);
        }
        setHoldings(d.holdings ?? []);
        setMyOrders(d.myOrders ?? []);
        setRecentTrades(d.recentTrades ?? []);
      }
      if (pRes.ok) {
        const pd = await readJson<{ ok: boolean; data: MemberProfile }>(pRes);
        if (pd.ok && pd.data) setProfile(pd.data);
      }
    } catch {
      // ignore background error
    }
  }, [initialSummary]);

  useEffect(() => {
    void loadLiveDashboard();
    const onMarketUpdate = () => void loadLiveDashboard();
    window.addEventListener('khesht:market-updated', onMarketUpdate);
    window.addEventListener('focus', onMarketUpdate);
    return () => {
      window.removeEventListener('khesht:market-updated', onMarketUpdate);
      window.removeEventListener('focus', onMarketUpdate);
    };
  }, [loadLiveDashboard]);

  if (!initialSummary) {
    return (
      <div className="empty-state" style={{ marginTop: 24 }}>
        <h2>برای مشاهدهٔ پروفایل کاربری، داشبورد معاملاتی، کیف پول اجاره و نمودار رشد سرمایه وارد شوید</h2>
        <p>با ورود یا ساخت حساب کاربری، کیف پول ۵۰۰ میلیون تومانی شما فعال شده و می‌توانید سهام پروژه‌ها را مدیریت کنید.</p>
        <Link href="/auth" className="button button-red" style={{ marginTop: 12 }}>
          ورود یا ثبت‌نام حساب کاربری <ArrowLeft size={16} />
        </Link>
      </div>
    );
  }

  async function handleTopUp(amount: number) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch('/api/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'topup', amountToman: amount }),
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message || 'کیف پول شما با موفقیت شارژ شد.');
      await loadLiveDashboard();
      window.dispatchEvent(new CustomEvent('khesht:market-updated'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClaimRental() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch('/api/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'claim_rental_income' }),
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message || 'عواید اجاره به کیف پول اجارهٔ شما واریز شد.');
      await loadLiveDashboard();
      window.dispatchEvent(new CustomEvent('khesht:market-updated'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTransferRentalToMain() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch('/api/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'transfer_rental_to_main' }),
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message || 'موجودی کیف پول اجاره به کیف پول اصلی شما منتقل شد.');
      await loadLiveDashboard();
      window.dispatchEvent(new CustomEvent('khesht:market-updated'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickBuy() {
    if (!quickProject) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch('/api/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'primary_buy', projectSlug: quickProject, shares: quickShares }),
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message || 'خرید سهام با موفقیت انجام شد.');
      await loadLiveDashboard();
      window.dispatchEvent(new CustomEvent('khesht:market-updated'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch(`/api/market?id=${encodeURIComponent(orderId)}`, { method: 'DELETE' });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error);
      setMessage(d.message || 'سفارش لغو شد.');
      await loadLiveDashboard();
      window.dispatchEvent(new CustomEvent('khesht:market-updated'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const activeHoldings = holdings.filter((h) => h.shares > 0 || h.lockedShares > 0);
  const livePortfolioValue = activeHoldings.reduce((acc, h) => {
    const p = projects.find((item) => item.slug === h.projectSlug);
    const price = p?.tokenPriceCurrent ?? h.avgPriceToman;
    return acc + (h.shares + h.lockedShares) * price;
  }, 0);

  const liveCostBasis = activeHoldings.reduce((acc, h) => {
    const p = projects.find((item) => item.slug === h.projectSlug);
    const initialPrice = p?.tokenPriceInitial ? Math.min(h.avgPriceToman, p.tokenPriceInitial) : Math.round(h.avgPriceToman * 0.92);
    return acc + (h.shares + h.lockedShares) * initialPrice;
  }, 0);

  const accruedRentalProfit =
    rentalWallet.totalEarnedRentalToman > 0
      ? rentalWallet.totalEarnedRentalToman
      : activeHoldings.reduce((acc, h) => {
          const p = projects.find((item) => item.slug === h.projectSlug);
          if (!p || (p.investmentModel !== 'rent' && (p.rentalYield ?? 0) <= 0)) return acc;
          const yieldPct = p.rentalYield || 11;
          const val = (h.shares + h.lockedShares) * (p.tokenPriceCurrent ?? h.avgPriceToman);
          return acc + Math.round((val * (yieldPct / 100)) / 4);
        }, 0);

  const capitalGainProfit = Math.max(0, livePortfolioValue - liveCostBasis);
  const totalEarnedProfit = capitalGainProfit + accruedRentalProfit;
  const totalWealth = walletBalance + livePortfolioValue + rentalWallet.balanceToman;

  const growthSeries = useMemo(() => {
    const baseCap = liveCostBasis > 0 ? liveCostBasis : 100_000_000;
    const profitNow = totalEarnedProfit > 0 ? totalEarnedProfit : 18_500_000;
    return [
      { month: 'فروردین', principal: Math.round(baseCap * 0.6), profit: Math.round(profitNow * 0.18) },
      { month: 'اردیبهشت', principal: Math.round(baseCap * 0.72), profit: Math.round(profitNow * 0.34) },
      { month: 'خرداد', principal: Math.round(baseCap * 0.85), profit: Math.round(profitNow * 0.51) },
      { month: 'تیر', principal: Math.round(baseCap * 0.92), profit: Math.round(profitNow * 0.68) },
      { month: 'مرداد', principal: baseCap, profit: Math.round(profitNow * 0.84) },
      { month: 'شهریور (جاری)', principal: baseCap, profit: profitNow },
    ];
  }, [liveCostBasis, totalEarnedProfit]);

  const maxChartVal = Math.max(...growthSeries.map((g) => g.principal + g.profit), 1);
  const openOrders = myOrders.filter((o) => o.status === 'open');
  const selectedQuickProj = projects.find((p) => p.slug === quickProject) ?? projects[0];
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || initialSummary.actor.displayName;

  const activityLog = useMemo(() => {
    const items: Array<{ id: string; title: string; detail: string; time: number; badge: string; tone: 'green' | 'brick' | 'navy' }> = [];
    for (const t of recentTrades) {
      if (t.buyerId === initialSummary.actor.userId || t.sellerId === initialSummary.actor.userId) {
        const pName = projects.find((p) => p.slug === t.projectSlug)?.name ?? t.projectSlug;
        const isBuyer = t.buyerId === initialSummary.actor.userId;
        items.push({
          id: `trade-${t.id}`,
          title: `${isBuyer ? 'خرید' : 'فروش'} ${fmt(t.shares)} سهم از «${pName}»`,
          detail: `${t.kind === 'primary' ? 'عرضهٔ اولیه پروژه' : 'بازار ثانویه'} · قیمت واحد: ${fmt(t.priceToman)} تومان · مبلغ کل: ${fmt(t.totalToman)} تومان`,
          time: t.createdAt,
          badge: isBuyer ? 'خرید سهام' : 'فروش سهام',
          tone: isBuyer ? 'green' : 'brick',
        });
      }
    }
    for (const o of myOrders) {
      const pName = projects.find((p) => p.slug === o.projectSlug)?.name ?? o.projectSlug;
      items.push({
        id: `order-${o.id}`,
        title: `ثبت سفارش ${o.side === 'buy' ? 'خرید' : 'فروش'} در بازار ثانویه (${pName})`,
        detail: `تعداد: ${fmt(o.initialShares)} سهم به قیمت ${fmt(o.priceToman)} تومان · وضعیت: ${o.status === 'open' ? 'فعال در تابلو' : o.status === 'filled' ? 'انجام‌شده' : 'لغوشده'}`,
        time: o.createdAt,
        badge: 'سفارش بازار ثانویه',
        tone: 'navy',
      });
    }
    for (const r of initialSummary.runs) {
      items.push({
        id: `run-${r.id}`,
        title: `ذخیرهٔ سناریوی تحلیل مالی «${r.name}»`,
        detail: `محاسبهٔ بازده و جریان نقدی در آزمایشگاه مالی پرونده`,
        time: r.createdAt,
        badge: 'تحلیل مالی',
        tone: 'navy',
      });
    }
    for (const sc of initialSummary.scenarios) {
      items.push({
        id: `scen-${sc.id}`,
        title: `ثبت سناریوی مدیریت ثروت «${sc.name}»`,
        detail: `بودجه: ${fmt(sc.virtualBudget)} تومان · افق: ${fmt(sc.horizonMonths)} ماه`,
        time: sc.updatedAt,
        badge: 'مدیریت ثروت',
        tone: 'green',
      });
    }
    return items.sort((a, b) => b.time - a.time);
  }, [recentTrades, myOrders, initialSummary, projects]);

  const rentalProjectsCatalog = useMemo(
    () => projects.filter((p) => p.investmentModel === 'rent' || (p.rentalYield ?? 0) > 0),
    [projects],
  );

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* 1. User Identity & Profile Summary Banner */}
      <section
        className="dashboard-panel"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          background: 'linear-gradient(135deg, rgba(25,25,112,.08), var(--whiteout))',
          borderColor: 'rgba(25,25,112,.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'var(--royalblue)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 900,
              fontSize: 22,
            }}
          >
            <UserRound size={26} />
          </div>
          <div>
            <span className="mini-label">مشخصات صاحب حساب و داشبورد سرمایه‌گذاری</span>
            <h2 style={{ margin: '4px 0 6px', fontSize: 22, color: 'var(--navy)' }}>{fullName}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', fontSize: 12, color: 'var(--muted)' }}>
              <span>
                ایمیل: <strong dir="ltr" style={{ color: 'var(--ink)' }}>{profile?.email ?? initialSummary.actor.email}</strong>
              </span>
              <span>
                شمارهٔ تماس:{' '}
                <strong dir="ltr" style={{ color: 'var(--ink)' }}>
                  {profile?.mobile ? profile.mobile : 'ثبت‌نشده (قابل تکمیل در ویرایش)'}
                </strong>
              </span>
              <span>
                سطح کاربری:{' '}
                <strong style={{ color: 'var(--profit-green)' }}>
                  {initialSummary.actor.role === 'admin' ? 'مدیر سامانه' : (profile?.tier ?? 'سرمایه‌گذار فعال')}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/tiers" className="button button-ghost button-small" style={{ borderColor: 'rgba(188,74,60,.35)', color: 'var(--brick)' }}>
            <Award size={14} /> سطوح کاربری و امتیازات
          </Link>
          <Link href="/profile/edit" className="button button-ghost button-small">
            <Settings size={14} /> ویرایش مشخصات و امنیت
          </Link>
          <Link href="/notifications" className="button button-ghost button-small">
            <Activity size={14} /> اعلان‌ها و سوابق من
          </Link>
          <Link href="/market" className="button button-red button-small">
            <ArrowDownUp size={14} /> ورود به بازار ثانویه
          </Link>
        </div>

        {/* Dedicated User Tier Element in Dashboard (المان سطح کاربری شخص) */}
        {(() => {
          const resolvedT = resolveTierByInvestment(livePortfolioValue, profile?.tierId);
          const curIdx = tiers.findIndex((t) => t.id === resolvedT.id);
          const nextT = curIdx < tiers.length - 1 ? tiers[curIdx + 1] : null;
          const progPct = profile?.tierProgressPercent ?? (nextT ? Math.min(100, Math.max(15, Math.round((livePortfolioValue / Math.max(1, nextT.minInvestmentToman)) * 100))) : 100);
          return (
            <div
              style={{
                width: '100%',
                marginTop: 6,
                padding: '14px 18px',
                borderRadius: 16,
                background: 'linear-gradient(135deg, #191970 0%, #23235B 60%, #7A2E27 100%)',
                color: '#FAF7F2',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: resolvedT.color,
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 900,
                  }}
                >
                  <Award size={22} />
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 15, color: '#FFFFFF' }}>سطح کاربری شما: سطح {resolvedT.name}</strong>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: '2px 9px',
                        borderRadius: 999,
                        background: 'rgba(110, 231, 183, 0.2)',
                        color: '#6EE7B7',
                      }}
                    >
                      تخفیف کارمزد معاملات: {fmt(resolvedT.feeDiscountPercent)}٪
                    </span>
                  </div>
                  <small style={{ fontSize: 11.5, color: 'rgba(250,247,242,0.85)', display: 'block', marginTop: 2 }}>
                    {resolvedT.access}
                  </small>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {nextT ? `پیشرفت تا سطح ${nextT.name}` : 'بالاترین سطح کاربری (تیتانیومی)'}
                  </span>
                  <strong style={{ color: '#FDE68A' }}>{fmt(progPct)}٪</strong>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progPct}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #FDE68A, #34D399)',
                    }}
                  />
                </div>
              </div>

              <Link
                href="/tiers"
                className="button button-small"
                style={{ background: '#FAF7F2', color: '#191970', fontWeight: 800 }}
              >
                ارتقا و مشاهدهٔ مزایا <ArrowLeft size={13} />
              </Link>
            </div>
          );
        })()}
      </section>

      {/* 2. Top 4 Financial KPI Cards (Main Cash Wallet + Rental Wallet + Portfolio Value + Total Profit) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        <div className="dashboard-card primary">
          <span>
            <Wallet size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> موجودی نقد کیف پول اصلی
          </span>
          <strong>{fmt(walletBalance)} تومان</strong>
          <small>ارزش کل دارایی و نقدینگی: {fmt(totalWealth)} تومان</small>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-ghost button-small"
              style={{ padding: '4px 9px', fontSize: 10 }}
              disabled={busy}
              onClick={() => void handleTopUp(100_000_000)}
            >
              <PlusCircle size={12} /> +۱۰۰ میلیون
            </button>
            <button
              type="button"
              className="button button-ghost button-small"
              style={{ padding: '4px 9px', fontSize: 10 }}
              disabled={busy}
              onClick={() => void handleTopUp(500_000_000)}
            >
              <PlusCircle size={12} /> +۵۰۰ میلیون
            </button>
          </div>
        </div>

        {/* Dedicated Rental Wallet Card (کیف پول اجاره) */}
        <div
          className="dashboard-card"
          style={{
            borderColor: 'rgba(188, 74, 60, .35)',
            background: 'linear-gradient(180deg, rgba(188, 74, 60, .09), var(--whiteout))',
          }}
        >
          <span style={{ color: 'var(--brick)', fontWeight: 800 }}>
            <KeyRound size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> کیف پول اجاره (پروژه‌های اجاره‌داری)
          </span>
          <strong style={{ color: 'var(--brick)' }}>{fmt(rentalWallet.balanceToman)} تومان</strong>
          <small style={{ color: 'var(--muted)' }}>
            کل اجارهٔ دریافتی تا امروز: {fmt(rentalWallet.totalEarnedRentalToman)} تومان ({fmt(rentalWallet.breakdown.length)} پروژهٔ ساخت - اجاره)
          </small>
          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-red button-small"
              style={{ padding: '4px 9px', fontSize: 10 }}
              disabled={busy}
              onClick={() => void handleClaimRental()}
            >
              دریافت سود اجارهٔ دوره
            </button>
            {rentalWallet.balanceToman > 0 && (
              <button
                type="button"
                className="button button-ghost button-small"
                style={{ padding: '4px 9px', fontSize: 10 }}
                disabled={busy}
                onClick={() => void handleTransferRentalToMain()}
              >
                انتقال به کیف پول اصلی
              </button>
            )}
          </div>
        </div>

        <div className="dashboard-card">
          <span>
            <Coins size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> ارزش روز پروژه‌های خریداری‌شده
          </span>
          <strong>{fmt(livePortfolioValue || initialSummary.portfolioValueToman)} تومان</strong>
          <small>
            در {fmt(activeHoldings.length)} پروژهٔ ملکی ({fmt(activeHoldings.reduce((a, b) => a + b.shares + b.lockedShares, 0))} سهم)
          </small>
        </div>

        <div
          className="dashboard-card"
          style={{
            borderColor: 'rgba(30, 107, 82, .32)',
            background: 'linear-gradient(180deg, rgba(30, 107, 82, .08), var(--whiteout))',
          }}
        >
          <span style={{ color: 'var(--profit-green)', fontWeight: 800 }}>
            <TrendingUp size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> کل سود به‌دست‌آمدهٔ شما
          </span>
          <strong style={{ color: 'var(--profit-green)' }}>+{fmt(totalEarnedProfit)} تومان</strong>
          <small style={{ color: 'var(--profit-green-deep)' }}>
            رشد ارزش سهام: +{fmt(capitalGainProfit)} · کیف پول اجاره: +{fmt(accruedRentalProfit)} تومان
          </small>
        </div>
      </div>

      {message && (
        <p className="sim-success" role="status" style={{ padding: 12, borderRadius: 10 }}>
          <CheckCircle2 size={16} /> {message}
        </p>
      )}
      {error && (
        <p className="sim-error" role="alert" style={{ padding: 12, borderRadius: 10 }}>
          {error}
        </p>
      )}

      {/* 3. Dedicated Rental Wallet Breakdown Panel (کیف پول اجاره از پروژه‌های ساخت - اجاره) */}
      <section
        className="dashboard-panel"
        style={{
          borderColor: 'rgba(188, 74, 60, .25)',
          background: 'linear-gradient(145deg, rgba(188, 74, 60, .04), var(--whiteout))',
        }}
      >
        <div className="panel-title-row" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="mini-label">عواید دوره‌ای املاک اجاره‌محور (ساخت - اجاره)</span>
            <h2 style={{ margin: '4px 0 0' }}>
              <KeyRound size={18} style={{ verticalAlign: 'middle', marginLeft: 6, color: 'var(--brick)' }} />
              جزئیات کیف پول اجاره و واریزی‌های پروژه‌های اجاره‌داری
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-red button-small"
              disabled={busy}
              onClick={() => void handleClaimRental()}
            >
              <PlusCircle size={13} /> واریز عواید دورهٔ جدید اجاره
            </button>
            <button
              type="button"
              className="button button-ghost button-small"
              disabled={busy || rentalWallet.balanceToman <= 0}
              onClick={() => void handleTransferRentalToMain()}
            >
              انتقال موجودی اجاره به کیف پول اصلی ({fmt(rentalWallet.balanceToman)} تومان)
            </button>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted)', margin: '8px 0 14px' }}>
          این کیف پول به‌صورت اختصاصی سود اجارهٔ سهام شما در پروژه‌های <strong>«ساخت - اجاره»</strong> (نارون، هما، ارغوان و آفتاب) را دریافت و نگهداری می‌کند.
        </p>

        {rentalWallet.breakdown.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {rentalWallet.breakdown.map((item) => (
              <div
                key={item.projectSlug}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--hairline)',
                  background: 'var(--ice-white)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Link href={`/projects/${item.projectSlug}`} style={{ fontWeight: 800, color: 'var(--navy)' }}>
                    {item.projectName}
                  </Link>
                  <span className="yield-badge" style={{ fontSize: 10 }}>
                    {fmt(item.rentalYield)}٪ اجاره سالانه
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'grid', gap: 4 }}>
                  <div>
                    سهام شما: <strong style={{ color: 'var(--ink)' }}>{fmt(item.shares)} سهم</strong> ({item.tokenSymbol})
                  </div>
                  <div>
                    اجارهٔ ماهانهٔ سهم شما:{' '}
                    <strong style={{ color: 'var(--profit-green)' }}>+{fmt(item.monthlyRentToman)} تومان</strong>
                  </div>
                  <div>
                    عواید انباشتهٔ واریزشده:{' '}
                    <strong style={{ color: 'var(--brick)' }}>+{fmt(item.accruedRentToman)} تومان</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              border: '1px dashed var(--hairline)',
              background: 'var(--ice-white)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <strong style={{ fontSize: 13, display: 'block', marginBottom: 4 }}>
                پروژه‌های اجاره‌داری آمادهٔ واریز به کیف پول اجاره:
              </strong>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                با خرید سهام از پروژه‌های «ساخت - اجاره» ({rentalProjectsCatalog.map((p) => p.name).join('، ')})، عواید ماهانهٔ اجاره در این کیف پول جمع‌آوری می‌شود.
              </span>
            </div>
            <Link href="/projects?model=rent" className="button button-ghost button-small">
              <Building2 size={14} /> مشاهدهٔ پروژه‌های ساخت - اجاره
            </Link>
          </div>
        )}
      </section>

      {/* 4. Graphical Portfolio & Profit Growth Chart */}
      <section className="dashboard-panel">
        <div className="panel-title-row" style={{ flexWrap: 'wrap' }}>
          <div>
            <span className="mini-label">روند ارزش‌آفرینی پرتفوی شما</span>
            <h2 style={{ margin: '4px 0 0' }}>
              <LineChart size={19} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              نمودار رشد سرمایه و سود انباشته
            </h2>
          </div>
          <div className="wealth-legend">
            <span>
              <i style={{ background: 'var(--royalblue)' }} /> اصل سرمایهٔ تخصیص‌یافته
            </span>
            <span>
              <i style={{ background: 'var(--profit-green)' }} /> سود رشد ارزش + عواید کیف پول اجاره
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 14,
            alignItems: 'end',
            height: 210,
            padding: '24px 12px 10px',
            marginTop: 14,
            borderBottom: '1px solid var(--hairline)',
            background: 'repeating-linear-gradient(to top, transparent 0 38px, rgba(25,25,112,.06) 39px)',
          }}
        >
          {growthSeries.map((pt) => {
            const pHeight = Math.max(12, Math.round((pt.principal / maxChartVal) * 140));
            const gHeight = Math.max(8, Math.round((pt.profit / maxChartVal) * 140));
            return (
              <div
                key={pt.month}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                <small style={{ fontSize: 10, fontWeight: 800, color: 'var(--profit-green)', marginBottom: 4 }}>
                  +{fmt(Math.round(pt.profit / 1_000_000))} م
                </small>
                <div
                  style={{
                    width: '100%',
                    maxWidth: 46,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '8px 8px 0 0',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    title={`سود انباشته: ${fmt(pt.profit)} تومان`}
                    style={{ height: gHeight, background: 'var(--profit-green)' }}
                  />
                  <div
                    title={`اصل سرمایه: ${fmt(pt.principal)} تومان`}
                    style={{ height: pHeight, background: 'var(--royalblue)' }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, marginTop: 8, color: 'var(--ink)' }}>{pt.month}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Purchased Projects & Quick Share Purchase */}
      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <div className="panel-title-row" style={{ marginBottom: 14 }}>
            <div>
              <span className="mini-label">پرتفوی زندهٔ شما (متصل به صفحهٔ پروژه‌ها)</span>
              <h2 style={{ margin: '4px 0 0' }}>
                <Layers3 size={18} /> دارایی‌های سهام من و پروژه‌های خریداری‌شده
              </h2>
            </div>
            <button type="button" className="text-button" onClick={() => void loadLiveDashboard()}>
              <RefreshCw size={13} /> بروزرسانی
            </button>
          </div>

          {activeHoldings.length === 0 ? (
            <div className="empty-state" style={{ padding: 28 }}>
              <p>هنوز سهمی در پرتفوی شما ثبت نشده است. از پنل روبرو، صفحهٔ پروژه‌ها یا بازار ثانویه اولین خرید خود را انجام دهید.</p>
              <Link href="/projects" className="button button-red button-small" style={{ marginTop: 10 }}>
                مشاهده و خرید از صفحهٔ پروژه‌ها
              </Link>
            </div>
          ) : (
            <div className="holdings-list">
              {activeHoldings.map((h) => {
                const p = projects.find((item) => item.slug === h.projectSlug);
                const curPrice = p?.tokenPriceCurrent ?? h.avgPriceToman;
                const baseCost = p?.tokenPriceInitial ? Math.min(h.avgPriceToman, p.tokenPriceInitial) : Math.round(h.avgPriceToman * 0.92);
                const totShares = h.shares + h.lockedShares;
                const val = totShares * curPrice;
                const capPnl = (curPrice - baseCost) * totShares;
                const isRental = p?.investmentModel === 'rent' || (p?.rentalYield ?? 0) > 0;
                const rentPnl = isRental ? Math.round((val * ((p?.rentalYield || 11) / 100)) / 4) : 0;
                const totalRowProfit = capPnl + rentPnl;
                const catBadge = p
                  ? getProjectCategoryBadge({
                      slug: p.slug,
                      investmentModel: p.investmentModel ?? 'hold',
                      type: p.type ?? 'فروش',
                    })
                  : 'ساخت - فروش';

                return (
                  <div className="holding-row" key={h.id}>
                    <div>
                      <div className="holding-name">
                        <span className="holding-dot" />
                        <Link href={`/projects/${h.projectSlug}`} style={{ fontWeight: 800 }}>
                          {p?.name ?? h.projectSlug}
                        </Link>
                        <b className="symbol-chip">{p?.tokenSymbol ?? 'KH'}</b>
                        <span className="symbol-chip" style={{ background: 'rgba(188,74,60,.12)', color: 'var(--brick)' }}>
                          {catBadge}
                        </span>
                      </div>
                      <small style={{ marginTop: 4 }}>
                        تعداد کل: <strong>{fmt(totShares)} سهم</strong> (آزاد: {fmt(h.shares)}{' '}
                        {h.lockedShares > 0 ? `· در صف فروش: ${fmt(h.lockedShares)}` : ''}) · قیمت روز هر سهم:{' '}
                        {fmt(curPrice)} تومان
                      </small>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <strong>ارزش روز: {fmt(val)} تومان</strong>
                      <small style={{ color: 'var(--profit-green)', fontWeight: 800 }}>
                        سود کل: +{fmt(totalRowProfit)} تومان {isRental ? `(شامل اجاره)` : ''}
                      </small>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                        <Link
                          href={`/projects/${h.projectSlug}`}
                          className="button button-ghost button-small"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                        >
                          صفحهٔ پروژه
                        </Link>
                        <Link
                          href={`/market/${h.projectSlug}`}
                          className="button button-red button-small"
                          style={{ padding: '4px 8px', fontSize: 10 }}
                        >
                          خرید / فروش ثانویه
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Primary Share Purchase directly from Dashboard */}
        <section className="dashboard-panel">
          <span className="mini-label">سرمایه‌گذاری سریع</span>
          <h2 style={{ margin: '4px 0 12px' }}>
            <ShoppingCart size={18} /> خرید فوری سهام از میزکار
          </h2>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '0 0 14px' }}>
            پروژه و تعداد سهام را انتخاب کنید تا بلافاصله از کیف پول شما خریداری شده و در پرتفوی و صفحهٔ پروژه‌ها ثبت شود.
          </p>
          <label className="form-field">
            <span>انتخاب پروژه</span>
            <select value={quickProject} onChange={(e) => setQuickProject(e.target.value)}>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.tokenSymbol}) — {fmt(p.tokenPriceCurrent)} تومان
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>تعداد سهام</span>
            <input
              type="number"
              min={1}
              max={100000}
              value={quickShares}
              onChange={(e) => setQuickShares(Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
          {selectedQuickProj && (
            <div className="market-total" style={{ marginTop: 14, paddingTop: 12 }}>
              <span>مبلغ قابل پرداخت:</span>
              <strong>{fmt(quickShares * selectedQuickProj.tokenPriceCurrent)} تومان</strong>
              <small>
                بازده پایهٔ برآوردی پروژه: +{fmt(selectedQuickProj.estimatedReturnBase)}٪ سالانه
                {selectedQuickProj.investmentModel === 'rent' ? ' · متصل به کیف پول اجاره' : ''}
              </small>
            </div>
          )}
          <button
            type="button"
            className="button button-red button-wide"
            style={{ marginTop: 14 }}
            disabled={busy || !quickProject}
            onClick={() => void handleQuickBuy()}
          >
            {busy ? 'در حال ثبت خرید…' : `خرید آنی ${fmt(quickShares)} سهم`} <ArrowLeft size={15} />
          </button>
        </section>
      </div>

      {/* 6. Open Orders & Complete Chronological Action History */}
      <div className="dashboard-grid">
        <section className="dashboard-panel">
          <h2>
            <ArrowDownUp size={18} /> سفارش‌های باز من در بازار ثانویه
          </h2>
          {openOrders.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>در حال حاضر سفارش بازی در تابلوی بازار ثانویه ندارید.</p>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {openOrders.map((o) => {
                const p = projects.find((item) => item.slug === o.projectSlug);
                return (
                  <div
                    key={o.id}
                    className="project-admin-row"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong>
                        {o.side === 'buy' ? 'سفارش خرید' : 'سفارش فروش'} · {p?.name ?? o.projectSlug}
                      </strong>
                      <small style={{ display: 'block' }}>
                        باقی‌مانده: {fmt(o.remainingShares)} از {fmt(o.initialShares)} سهم · قیمت واحد:{' '}
                        {fmt(o.priceToman)} تومان
                      </small>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => void handleCancelOrder(o.id)}
                    >
                      <XCircle size={14} /> لغو سفارش
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-panel">
          <h2>
            <Activity size={18} /> تاریخچهٔ کامل اقدامات و تراکنش‌های انجام‌شده
          </h2>
          {activityLog.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--muted)' }}>
              هنوز تراکنش یا اقدامی ثبت نشده است؛ با اولین خرید یا ثبت سفارش، تاریخچهٔ کامل در اینجا نمایش داده می‌شود.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {activityLog.map((item) => (
                <div key={item.id} className="project-admin-row">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong>{item.title}</strong>
                    <span
                      className="symbol-chip"
                      style={{
                        background:
                          item.tone === 'green'
                            ? 'var(--profit-green-soft)'
                            : item.tone === 'brick'
                              ? 'var(--red-soft)'
                              : 'rgba(25,25,112,.1)',
                        color:
                          item.tone === 'green'
                            ? 'var(--profit-green)'
                            : item.tone === 'brick'
                              ? 'var(--brick)'
                              : 'var(--royalblue)',
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                  <small style={{ display: 'block', marginTop: 4 }}>{item.detail}</small>
                  <small style={{ display: 'block', marginTop: 2, opacity: 0.75 }}>
                    {new Date(item.time).toLocaleString('fa-IR')}
                  </small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
