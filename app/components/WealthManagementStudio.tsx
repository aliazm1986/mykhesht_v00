'use client';

import { readJson } from '@/lib/api-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  Check,
  CheckCircle2,
  Coins,
  History,
  KeyRound,
  Landmark,
  Layers3,
  RefreshCw,
  Save,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  formatCompactToman,
  formatToman,
  getProjectCategoryBadge,
  type ProjectProfile,
  type Property,
} from '@/lib/data';
import { compareProjects, type AnalysisStyle, type ProjectMetric } from '@/lib/wealth-model';

type SavedScenario = {
  id: string;
  name: string;
  selectedProjectSlugs: string;
  virtualBudget: number;
  horizonMonths: number;
  analysisStyle: AnalysisStyle;
  updatedAt: number;
  snapshotJson: string;
};

const styleDescriptions: Record<AnalysisStyle, { title: string; subtitle: string; badge: string }> = {
  guarded: {
    title: 'محافظه‌کارانه (کم‌ریسک و اجاره‌محور)',
    subtitle: 'وزن بیشتر به پروژه‌های آمادهٔ بهره‌برداری و دارای جریان نقدی کیف پول اجاره',
    badge: 'حداقل ریسک',
  },
  balanced: {
    title: 'متوازن (ترکیب ساخت و اجاره)',
    subtitle: 'توزیع متعادل سرمایه میان پروژه‌های ساخت - فروش، بازسازی و ساخت - اجاره',
    badge: 'پیشنهاد کارشناسان',
  },
  growth: {
    title: 'رشدگرا (حداکثر بازده سرمایه‌ای)',
    subtitle: 'تمرکز بر پروژه‌های ساخت و بازسازی پربازده با پتانسیل رشد قیمتی بالا',
    badge: 'حداکثر سود',
  },
};

const PRESET_BUDGETS = [50_000_000, 100_000_000, 250_000_000, 500_000_000, 1_000_000_000];
const PRESET_HORIZONS = [6, 12, 18, 24, 30];

export function WealthManagementStudio({
  properties,
}: {
  properties: Property[];
  projectProfiles: Record<string, ProjectProfile>;
}) {
  const [metrics, setMetrics] = useState<ProjectMetric[]>([]);
  const [selected, setSelected] = useState<string[]>(properties.slice(0, 3).map((p) => p.slug));
  const [budget, setBudget] = useState<number>(300_000_000);
  const [horizon, setHorizon] = useState<number>(18);
  const [style, setStyle] = useState<AnalysisStyle>('balanced');
  const [name, setName] = useState<string>('سبد ترکیبی منتخب من');
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);

  const load = useCallback(async () => {
    try {
      const [mRes, sRes, mktRes] = await Promise.all([
        fetch('/api/wealth/metrics', { cache: 'no-store' }),
        fetch('/api/wealth/scenarios', { cache: 'no-store' }),
        fetch('/api/market', { cache: 'no-store' }),
      ]);

      if (mRes.ok) {
        const m = await readJson<{ metrics: ProjectMetric[] }>(mRes);
        if (m.metrics) setMetrics(m.metrics);
      }
      if (sRes.ok) {
        const s = await readJson<{ scenarios: SavedScenario[] }>(sRes);
        if (s.scenarios) setSaved(s.scenarios);
      }
      if (mktRes.ok) {
        const mk = await readJson<{ wallet?: { balanceToman: number } }>(mktRes);
        if (mk.wallet) setWalletBalance(mk.wallet.balanceToman);
      }
    } catch {
      // Guest fallback
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Fallback client metrics if user is guest or metrics haven't loaded yet
  const effectiveMetrics: ProjectMetric[] = useMemo(() => {
    if (metrics.length > 0) return metrics;
    return properties.map((p) => ({
      slug: p.slug,
      name: p.name,
      riskLevel: p.riskLevel,
      months: 15,
      readiness: p.progress > 0 ? p.progress : 26,
      dataQuality: 96,
      planRevision: 1,
      rates: {
        conservative: p.estimatedReturnLow || 17,
        base: p.estimatedReturnBase || 26,
        optimistic: p.estimatedReturnHigh || 34,
      },
      unavailableReason: null,
    }));
  }, [metrics, properties]);

  const result = useMemo(
    () => compareProjects(effectiveMetrics.filter((m) => selected.includes(m.slug)), style, horizon),
    [effectiveMetrics, selected, style, horizon],
  );

  // Compute rich portfolio breakdown (shares, capital gain, rental income, total final value)
  const portfolioSummary = useMemo(() => {
    let totalAllocated = 0;
    let totalCapitalProfit = 0;
    let totalRentalProfit = 0;
    let totalShares = 0;

    const items = result.allocations.map((alloc) => {
      const prop = properties.find((p) => p.slug === alloc.slug) ?? properties[0];
      const unitPrice = prop?.tokenPriceCurrent || prop?.tokenPriceInitial || 500_000;
      const rawAmount = Math.round((budget * alloc.weight) / 100);
      const shares = Math.max(1, Math.round(rawAmount / unitPrice));
      const allocatedToman = shares * unitPrice;
      const ratePct = alloc.returnRate ?? prop?.estimatedReturnBase ?? 25;
      const capProfit = Math.round(allocatedToman * (ratePct / 100));
      const rentYield = prop?.rentalYield ?? 0;
      const rentProfit =
        rentYield > 0 ? Math.round(allocatedToman * (rentYield / 100) * (horizon / 12)) : 0;
      const itemTotalProfit = capProfit + rentProfit;

      totalAllocated += allocatedToman;
      totalCapitalProfit += capProfit;
      totalRentalProfit += rentProfit;
      totalShares += shares;

      return {
        ...alloc,
        prop,
        unitPrice,
        shares,
        allocatedToman,
        ratePct,
        capProfit,
        rentProfit,
        itemTotalProfit,
        finalValue: allocatedToman + itemTotalProfit,
        categoryBadge: prop ? getProjectCategoryBadge(prop) : 'ساخت - فروش',
      };
    });

    const totalProfit = totalCapitalProfit + totalRentalProfit;
    const finalPortfolioValue = totalAllocated + totalProfit;
    const totalRoiPct = totalAllocated > 0 ? Math.round((totalProfit / totalAllocated) * 100) : 0;

    return {
      items,
      totalAllocated,
      totalCapitalProfit,
      totalRentalProfit,
      totalProfit,
      finalPortfolioValue,
      totalRoiPct,
      totalShares,
    };
  }, [result.allocations, properties, budget, horizon]);

  async function handleSaveScenario() {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch('/api/wealth/scenarios', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'سبد سرمایه‌گذاری من',
          selectedProjectSlugs: selected,
          virtualBudget: budget,
          horizonMonths: horizon,
          analysisStyle: style,
        }),
      });
      if (r.status === 401) {
        window.location.assign('/auth');
        return;
      }
      const d = await readJson<{ error?: string }>(r);
      if (!r.ok) throw new Error(d.error || 'خطا در ذخیرهٔ سناریو');
      setMessage('سناریوی چیدمان سبد ثروت شما با موفقیت در سرور ذخیره شد.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteScenario(id: string) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch(`/api/wealth/scenarios?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error || 'خطا در حذف سناریو');
      setMessage(d.message || 'سناریوی انتخاب‌شده حذف گردید.');
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBuyEntireBasket() {
    if (!portfolioSummary.items.length) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      for (const item of portfolioSummary.items) {
        const sharesToBuy = Math.max(1, Math.min(20, item.shares));
        const r = await fetch('/api/market', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'primary_buy',
            projectSlug: item.slug,
            shares: sharesToBuy,
          }),
        });
        if (r.status === 401) {
          window.location.assign('/auth');
          return;
        }
        const d = await readJson<{ error?: string }>(r);
        if (!r.ok) throw new Error(d.error || `خطا در خرید سهام ${item.name}`);
      }
      setMessage('خرید سبد سهام انتخابی شما با موفقیت انجام شد و به داشبورد اضافه گردید.');
      window.dispatchEvent(new CustomEvent('khesht:market-updated'));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const barColors = ['#191970', '#BC4A3C', '#1E6B52', '#AA4A44'];

  return (
    <section className="wealth-studio" style={{ display: 'grid', gap: 22 }}>
      {/* Hero Banner */}
      <div className="wealth-studio-top" style={{ padding: 'clamp(24px, 4vw, 36px)', borderRadius: 24 }}>
        <div>
          <span className="mini-label">
            <Landmark size={15} /> استودیو هوشمند مدیریت ثروت و چیدمان سبد ملکی
          </span>
          <h1 style={{ fontSize: 'clamp(24px, 3.2vw, 36px)', margin: '8px 0 10px' }}>
            مدیریت ثروت و طراحی سبد سرمایه‌گذاری پیش از تصمیم
          </h1>
          <p style={{ maxWidth: '68ch', lineHeight: 1.8, opacity: 0.92 }}>
            سرمایهٔ خود را میان ۱ تا ۴ پروژهٔ «ساخت - فروش»، «بازسازی - فروش» و «ساخت - اجاره» توزیع کنید، سهم سود رشد قیمت و عواید کیف پول اجاره را بسنجید و بهترین ترکیب را ذخیره یا خریداری نمایید.
          </p>
        </div>
        <div style={{ display: 'grid', gap: 8, textAlign: 'left' }}>
          <span className="wealth-safe-seal">
            <ShieldCheck size={16} /> متصل به موتور مالی و بازار ثانویه
          </span>
          {walletBalance !== null && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: '8px 14px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.12)',
                color: '#6EE7B7',
                textAlign: 'center',
              }}
            >
              موجودی کیف پول شما: {formatCompactToman(walletBalance)} تومان
            </span>
          )}
        </div>
      </div>

      {/* Step 1: Clean High-Contrast Control Panel */}
      <div
        className="dashboard-panel"
        style={{
          padding: 24,
          background: 'linear-gradient(145deg, #FFFFFF, #FAF5EC)',
          border: '1px solid rgba(188, 74, 60, 0.24)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {/* Budget Control */}
          <div
            style={{
              background: 'var(--ice-white)',
              border: '1px solid var(--hairline)',
              borderRadius: 16,
              padding: 18,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--navy)' }}>
                <Wallet size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> ۱. بودجهٔ کل سبد سرمایه‌گذاری:
              </span>
              <strong style={{ fontSize: 18, color: 'var(--brick)' }}>{formatToman(budget)} تومان</strong>
            </div>
            <input
              type="range"
              min={10_000_000}
              max={2_000_000_000}
              step={10_000_000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--brick)', cursor: 'pointer', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_BUDGETS.map((b) => (
                <button
                  key={b}
                  type="button"
                  className={`geo-switch-btn ${budget === b ? 'active' : ''}`}
                  onClick={() => setBudget(b)}
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  {formatCompactToman(b)}
                </button>
              ))}
              {walletBalance !== null && walletBalance >= 5_000_000 && (
                <button
                  type="button"
                  className={`geo-switch-btn ${budget === walletBalance ? 'active' : ''}`}
                  onClick={() => setBudget(walletBalance)}
                  style={{ fontSize: 11, padding: '5px 10px' }}
                >
                  کل موجودی کیف پول
                </button>
              )}
            </div>
          </div>

          {/* Horizon Control */}
          <div
            style={{
              background: 'var(--ice-white)',
              border: '1px solid var(--hairline)',
              borderRadius: 16,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--navy)' }}>
                  ۲. افق زمانی نگهداری سبد:
                </span>
                <strong style={{ fontSize: 18, color: 'var(--royalblue)' }}>{formatToman(horizon)} ماه</strong>
              </div>
              <input
                type="range"
                min={6}
                max={30}
                step={3}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--royalblue)', cursor: 'pointer', marginBottom: 12 }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRESET_HORIZONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`geo-switch-btn ${horizon === m ? 'active' : ''}`}
                  onClick={() => setHorizon(m)}
                  style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '6px 8px' }}
                >
                  {formatToman(m)} ماه
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Cards */}
        <div style={{ marginTop: 18 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--navy)', display: 'block', marginBottom: 10 }}>
            ۳. انتخاب استراتژی وزن‌دهی و چیدمان سبد:
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
            {(['guarded', 'balanced', 'growth'] as const).map((key) => {
              const info = styleDescriptions[key];
              const isSelected = style === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStyle(key)}
                  style={{
                    textAlign: 'right',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: isSelected ? '2px solid var(--brick)' : '1px solid var(--hairline)',
                    background: isSelected ? 'rgba(188, 74, 60, 0.08)' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all .15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: 13.5, color: 'var(--navy)' }}>{info.title}</strong>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: isSelected ? 'var(--brick)' : 'rgba(25,25,112,0.08)',
                        color: isSelected ? '#FFFFFF' : 'var(--royalblue)',
                      }}
                    >
                      {info.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--muted)', margin: 0, lineHeight: 1.65 }}>{info.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 2: High-Contrast Project Picker */}
      <section className="dashboard-panel" style={{ padding: 24 }}>
        <div className="panel-title-row" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <span className="mini-label">تنوع‌بخشی به دارایی‌های ملکی</span>
            <h2 style={{ margin: '4px 0 0' }}>انتخاب ۱ تا ۴ پروژه برای چیدمان در سبد ثروت</h2>
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--brick)' }}>
            {formatToman(selected.length)} پروژه انتخاب شده است
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {properties.map((p) => {
            const isSelected = selected.includes(p.slug);
            const catBadge = getProjectCategoryBadge(p);
            const isDisabled = !isSelected && selected.length >= 4;
            return (
              <button
                key={p.slug}
                type="button"
                disabled={isDisabled}
                onClick={() =>
                  setSelected((prev) =>
                    prev.includes(p.slug)
                      ? prev.length > 1
                        ? prev.filter((s) => s !== p.slug)
                        : prev
                      : [...prev, p.slug],
                  )
                }
                style={{
                  textAlign: 'right',
                  padding: 14,
                  borderRadius: 14,
                  border: isSelected ? '2px solid var(--royalblue)' : '1px solid rgba(25, 25, 112, 0.18)',
                  background: isSelected ? 'rgba(25, 25, 112, 0.07)' : '#FFFFFF',
                  opacity: isDisabled ? 0.55 : 1,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 8,
                  boxShadow: isSelected ? '0 8px 20px rgba(25, 25, 112, 0.10)' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(188, 74, 60, 0.12)',
                      color: 'var(--brick)',
                    }}
                  >
                    {catBadge}
                  </span>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '1.5px solid rgba(25,25,112,0.3)',
                      background: isSelected ? 'var(--profit-green)' : 'transparent',
                      color: '#FFF',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {isSelected && <Check size={13} />}
                  </span>
                </div>
                <div>
                  <strong style={{ fontSize: 14.5, color: 'var(--navy)', display: 'block' }}>{p.name}</strong>
                  <small style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {p.location} · {p.status}
                  </small>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 8,
                    borderTop: '1px dashed var(--hairline)',
                    fontSize: 11.5,
                    width: '100%',
                  }}
                >
                  <span style={{ color: 'var(--profit-green)', fontWeight: 800 }}>
                    +{formatToman(p.estimatedReturnBase)}٪ بازده پایه
                  </span>
                  <span style={{ color: 'var(--ink)', fontWeight: 700 }}>
                    {formatToman(p.tokenPriceCurrent)} ت/سهم
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 3: Rich Selected Project Comparison & Allocation Cards */}
      <div className="finance-scenario-grid">
        {portfolioSummary.items.map((item) => (
          <article
            className="finance-result"
            key={item.slug}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(25, 25, 112, 0.16)',
              borderRadius: 18,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(188, 74, 60, 0.12)',
                    color: 'var(--brick)',
                  }}
                >
                  {item.categoryBadge} · سهم در سبد: {formatToman(item.weight)}٪
                </span>
                <span className="yield-badge" style={{ fontSize: 11 }}>
                  +{formatToman(item.ratePct)}٪ بازده دوره
                </span>
              </div>

              <h3 style={{ fontSize: 18, color: 'var(--navy)', margin: '4px 0 4px' }}>{item.name}</h3>
              <small style={{ color: 'var(--muted)', display: 'block', marginBottom: 14 }}>
                {item.prop?.location} · وضعیت: {item.prop?.status}
              </small>

              <dl style={{ display: 'grid', gap: 8, margin: '12px 0', fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt style={{ color: 'var(--muted)' }}>بودجهٔ تخصیص‌یافته:</dt>
                  <dd style={{ fontWeight: 800, color: 'var(--navy)' }}>{formatToman(item.allocatedToman)} تومان</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt style={{ color: 'var(--muted)' }}>تعداد سهام قابل خرید:</dt>
                  <dd style={{ fontWeight: 800 }}>{formatToman(item.shares)} سهم</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt style={{ color: 'var(--muted)' }}>سود رشد ارزش سهام:</dt>
                  <dd style={{ fontWeight: 800, color: 'var(--profit-green)' }}>+{formatToman(item.capProfit)} تومان</dd>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <dt style={{ color: 'var(--muted)' }}>عواید کیف پول اجاره:</dt>
                  <dd style={{ fontWeight: 800, color: item.rentProfit > 0 ? 'var(--brick)' : 'var(--muted)' }}>
                    {item.rentProfit > 0 ? `+${formatToman(item.rentProfit)} تومان` : 'سود در فروش نهایی'}
                  </dd>
                </div>
              </dl>

              {/* Styled Visual Progress Bars */}
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span>پیشرفت اجرایی / جذب سرمایه</span>
                  <strong>{formatToman(item.readiness)}٪</strong>
                </div>
                <div className="progress-line" style={{ height: 7, margin: '0 0 10px' }}>
                  <span style={{ width: `${Math.max(10, item.readiness)}%`, background: 'var(--royalblue)' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span>تأیید و اصالت اسناد اتاق داده</span>
                  <strong style={{ color: 'var(--profit-green)' }}>{formatToman(item.dataQuality)}٪</strong>
                </div>
                <div className="progress-line" style={{ height: 7, margin: 0 }}>
                  <span style={{ width: `${item.dataQuality}%`, background: 'var(--profit-green)' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed var(--hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--profit-green)' }}>
                ارزش پایان دوره: {formatCompactToman(item.finalValue)} تومان
              </span>
              <Link className="inline-link" href={`/projects/${item.slug}`} style={{ fontSize: 11.5 }}>
                صفحهٔ پروژه <ArrowLeft size={13} />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {/* Step 4: Full-Width Portfolio Outcome & Visual Charts */}
      <section className="dashboard-panel" style={{ padding: 24 }}>
        <div className="panel-title-row" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <div>
            <span className="mini-label">خروجی تجمیعی سبد در افق {formatToman(horizon)} ماهه</span>
            <h2 style={{ margin: '4px 0 0' }}>
              <Calculator size={19} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              نتیجهٔ شبیه‌سازی سبد ثروت و تفکیک سود
            </h2>
          </div>
          <span className="yield-badge" style={{ fontSize: 13, padding: '6px 14px' }}>
            بازده کل سبد: +{formatToman(portfolioSummary.totalRoiPct)}٪
          </span>
        </div>

        {/* 4 Full-Width KPI Boxes (No empty space!) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div className="dashboard-card">
            <span>
              <Coins size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> کل سرمایهٔ تخصیص‌یافته
            </span>
            <strong>{formatToman(portfolioSummary.totalAllocated)} تومان</strong>
            <small>مجموع {formatToman(portfolioSummary.totalShares)} سهم در {formatToman(portfolioSummary.items.length)} پروژه</small>
          </div>

          <div className="dashboard-card">
            <span style={{ color: 'var(--profit-green)', fontWeight: 700 }}>
              <TrendingUp size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> سود رشد ارزش املاک
            </span>
            <strong style={{ color: 'var(--profit-green)' }}>+{formatToman(portfolioSummary.totalCapitalProfit)} تومان</strong>
            <small>سود حاصل از ساخت، بازسازی و رشد قیمت</small>
          </div>

          <div className="dashboard-card">
            <span style={{ color: 'var(--brick)', fontWeight: 700 }}>
              <KeyRound size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> عواید کیف پول اجاره
            </span>
            <strong style={{ color: 'var(--brick)' }}>+{formatToman(portfolioSummary.totalRentalProfit)} تومان</strong>
            <small>درآمد اجارهٔ پروژه‌های ساخت - اجاره در دوره</small>
          </div>

          <div
            className="dashboard-card primary"
            style={{ background: 'linear-gradient(135deg, #191970, #23235B)' }}
          >
            <span style={{ color: '#FDE68A' }}>ارزش کل نهایی سبد (اصل + سود)</span>
            <strong style={{ color: '#FFFFFF' }}>{formatToman(portfolioSummary.finalPortfolioValue)} تومان</strong>
            <small style={{ color: '#6EE7B7' }}>
              کل سود خالص: +{formatToman(portfolioSummary.totalProfit)} تومان
            </small>
          </div>
        </div>

        {/* Visual Weight Bar & Return Comparison */}
        <div
          style={{
            background: 'var(--ice-white)',
            border: '1px solid var(--hairline)',
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13.5, color: 'var(--navy)' }}>نمودار ترکیب بودجه و مقایسهٔ بازده پروژه‌های سبد</strong>
            <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>استراتژی: {styleDescriptions[style].title}</span>
          </div>

          <div className="wealth-weight-bar" role="img" aria-label="سهم هر پروژه در سبد" style={{ height: 26, borderRadius: 10 }}>
            {portfolioSummary.items.map((item, i) => (
              <span
                key={item.slug}
                style={{ width: `${item.weight}%`, background: barColors[i % barColors.length], fontSize: 11, fontWeight: 800 }}
                title={`${item.name}: ${formatToman(item.weight)}٪`}
              >
                {formatToman(item.weight)}٪
              </span>
            ))}
          </div>

          <div className="wealth-legend" style={{ marginTop: 10, marginBottom: 16 }}>
            {portfolioSummary.items.map((item, i) => (
              <span key={item.slug}>
                <i style={{ background: barColors[i % barColors.length] }} />
                <strong>{item.name}:</strong> {formatToman(item.allocatedToman)} تومان ({formatToman(item.shares)} سهم)
              </span>
            ))}
          </div>

          <div className="wealth-return-chart" style={{ display: 'grid', gap: 10 }}>
            {portfolioSummary.items.map((item) => {
              const maxRate = Math.max(1, ...portfolioSummary.items.map((r) => Math.abs(r.ratePct)));
              const widthPct = Math.min(100, Math.round((Math.abs(item.ratePct) / maxRate) * 100));
              return (
                <article key={item.slug}>
                  <b style={{ fontSize: 12.5 }}>{item.name}</b>
                  <div className="wealth-return-track" style={{ height: 12 }}>
                    <span style={{ width: `${widthPct}%`, background: 'linear-gradient(90deg, var(--brick), var(--profit-green))' }} />
                  </div>
                  <strong style={{ color: 'var(--profit-green)' }}>+{formatToman(item.ratePct)}٪</strong>
                </article>
              );
            })}
          </div>
        </div>

        {/* Save & Action Bar */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <input
              type="text"
              value={name}
              minLength={2}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              placeholder="نام دلخواه برای ذخیرهٔ این سبد…"
              style={{
                flex: 1,
                minWidth: 220,
                minHeight: 42,
                borderRadius: 10,
                border: '1px solid var(--hairline)',
                padding: '8px 14px',
                background: 'var(--ice-white)',
                fontSize: 12.5,
              }}
            />
            <button
              type="button"
              className="button button-red"
              disabled={busy || !selected.length}
              onClick={() => void handleSaveScenario()}
            >
              <Save size={15} /> {busy ? 'در حال ثبت…' : 'ذخیرهٔ سناریو در حساب من'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-ghost"
              disabled={busy || !selected.length}
              onClick={() => void handleBuyEntireBasket()}
            >
              <ShoppingCart size={15} /> خرید سهام پروژه‌های این سبد
            </button>
            <button type="button" className="button button-ghost" onClick={() => void load()}>
              <RefreshCw size={14} /> بروزرسانی
            </button>
          </div>
        </div>

        {message && (
          <p role="status" className="sim-success" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
            <CheckCircle2 size={15} /> {message}
          </p>
        )}
        {error && (
          <p role="alert" className="sim-error" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
            {error}
          </p>
        )}
      </section>

      {/* Step 5: Redesigned Saved Scenarios Section (No JSON export!) */}
      <section className="dashboard-panel" style={{ padding: 24 }}>
        <div className="panel-title-row" style={{ flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <span className="mini-label">آرشیو سبدهای سرمایه‌گذاری شما</span>
            <h2 style={{ margin: '4px 0 0' }}>
              <History size={18} style={{ verticalAlign: 'middle', marginLeft: 6 }} />
              سناریوهای ثبت‌شدهٔ من
            </h2>
          </div>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            {formatToman(saved.length)} سناریو در حساب شما ذخیره شده است
          </span>
        </div>

        {saved.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <p>هنوز سناریویی ذخیره نکرده‌اید. از بخش بالا بودجه و پروژه‌های دلخواه را انتخاب و روی دکمهٔ «ذخیرهٔ سناریو در حساب من» کلیک کنید.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
            {saved.map((s) => {
              let slugs: string[] = [];
              try {
                slugs = JSON.parse(s.selectedProjectSlugs) as string[];
              } catch {
                slugs = [];
              }
              let parsedSnap: { weightedReturn?: number | null } = {};
              try {
                parsedSnap = JSON.parse(s.snapshotJson) as { weightedReturn?: number | null };
              } catch {
                parsedSnap = {};
              }
              const weightedRet = parsedSnap.weightedReturn ?? 26;
              const estProfit = Math.round(s.virtualBudget * (weightedRet / 100));
              const styleInfo = styleDescriptions[s.analysisStyle] ?? styleDescriptions.balanced;

              return (
                <article
                  key={s.id}
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    border: '1px solid var(--hairline)',
                    background: 'var(--ice-white)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <strong style={{ fontSize: 15, color: 'var(--navy)' }}>{s.name}</strong>
                      <span
                        className="symbol-chip"
                        style={{ background: 'rgba(25,25,112,0.08)', color: 'var(--royalblue)' }}
                      >
                        { new Date(s.updatedAt).toLocaleDateString('fa-IR') }
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--muted)', display: 'grid', gap: 4, marginBottom: 10 }}>
                      <div>
                        بودجهٔ سبد: <strong style={{ color: 'var(--ink)' }}>{formatToman(s.virtualBudget)} تومان</strong> · افق:{' '}
                        <strong>{formatToman(s.horizonMonths)} ماه</strong>
                      </div>
                      <div>
                        استراتژی: <strong style={{ color: 'var(--brick)' }}>{styleInfo.title}</strong>
                      </div>
                      <div>
                        سود برآوردی دوره:{' '}
                        <strong style={{ color: 'var(--profit-green)' }}>
                          +{formatToman(estProfit)} تومان (+{formatToman(weightedRet)}٪)
                        </strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {slugs.map((slug) => {
                        const p = properties.find((item) => item.slug === slug);
                        return (
                          <span
                            key={slug}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 8,
                              background: '#FFFFFF',
                              border: '1px solid var(--hairline)',
                              color: 'var(--navy)',
                            }}
                          >
                            <Layers3 size={11} style={{ verticalAlign: 'middle', marginLeft: 3 }} />
                            {p?.name ?? slug}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 10, borderTop: '1px dashed var(--hairline)' }}>
                    <button
                      type="button"
                      className="button button-red button-small"
                      style={{ flex: 1 }}
                      onClick={() => {
                        if (slugs.length) setSelected(slugs);
                        setBudget(s.virtualBudget);
                        setHorizon(s.horizonMonths);
                        setStyle(s.analysisStyle);
                        setName(s.name);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      بارگذاری این سناریو روی شبیه‌ساز
                    </button>
                    <button
                      type="button"
                      className="button button-ghost button-small"
                      style={{ color: 'var(--brick)' }}
                      disabled={busy}
                      onClick={() => void handleDeleteScenario(s.id)}
                      title="حذف سناریو"
                    >
                      <Trash2 size={14} /> حذف
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
