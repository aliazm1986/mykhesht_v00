'use client';

import { readJson } from '@/lib/api-client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownUp,
  ArrowLeft,
  CheckCircle2,
  Coins,
  History,
  Layers3,
  PlusCircle,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { Property } from '@/lib/data';

type MarketProject = {
  slug: string;
  name: string;
  location: string;
  type: string;
  investmentModel: string;
  tokenSymbol: string;
  tokenPriceInitial: number;
  tokenPriceCurrent: number;
  availableTokenSupply: number;
  totalTokenSupply: number;
  estimatedReturnBase: number;
  rentalYield: number;
  riskLevel: string;
  status: string;
};

type Holding = {
  id: string;
  projectSlug: string;
  shares: number;
  lockedShares: number;
  avgPriceToman: number;
};

type Order = {
  id: string;
  userId: string;
  userDisplayName: string;
  projectSlug: string;
  side: 'buy' | 'sell';
  priceToman: number;
  initialShares: number;
  remainingShares: number;
  status: 'open' | 'filled' | 'cancelled';
  createdAt: number;
};

type Trade = {
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

type MarketState = {
  actor: { userId: string; displayName: string; email: string; role: string };
  wallet: { balanceToman: number; updatedAt: number };
  projects: MarketProject[];
  selectedProject: string;
  holdings: Holding[];
  orderBook: { sells: Order[]; buys: Order[] };
  myOrders: Order[];
  recentTrades: Trade[];
};

const fmt = (v: number) => Math.round(v).toLocaleString('fa-IR');

export function MarketBoard({ project }: { project?: Property }) {
  const [data, setData] = useState<MarketState | null>(null);
  const [slug, setSlug] = useState(project?.slug ?? '');
  const [mode, setMode] = useState<'primary' | 'secondary_buy' | 'secondary_sell'>('primary');
  const [shares, setShares] = useState(10);
  const [priceToman, setPriceToman] = useState(project?.tokenPriceCurrent || 525_000);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [unauth, setUnauth] = useState(false);

  async function load(targetSlug = slug) {
    try {
      setError('');
      const q = targetSlug ? `?project=${encodeURIComponent(targetSlug)}` : '';
      const r = await fetch(`/api/market${q}`, { cache: 'no-store' });
      if (r.status === 401) {
        setUnauth(true);
        return;
      }
      const d = await readJson<MarketState & { error?: string }>(r);
      if (!r.ok) throw Error(d.error || 'خطا در دریافت اطلاعات بازار');
      setUnauth(false);
      setData(d);
      const nextSlug = targetSlug || d.selectedProject || d.projects[0]?.slug || '';
      if (nextSlug !== slug) setSlug(nextSlug);
      const activeProj = d.projects.find((p) => p.slug === nextSlug);
      if (activeProj && (!priceToman || targetSlug !== slug)) {
        setPriceToman(activeProj.tokenPriceCurrent);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load(project?.slug ?? slug);
  }, [project?.slug]);

  const currentProject = useMemo(
    () => data?.projects.find((p) => p.slug === slug) ?? data?.projects[0] ?? null,
    [data, slug],
  );

  const currentHolding = useMemo(
    () => data?.holdings.find((h) => h.projectSlug === (currentProject?.slug ?? slug)) ?? null,
    [data, currentProject, slug],
  );

  const handleProjectChange = (nextSlug: string) => {
    setSlug(nextSlug);
    const p = data?.projects.find((item) => item.slug === nextSlug);
    if (p) setPriceToman(p.tokenPriceCurrent);
    void load(nextSlug);
  };

  async function topUpWallet(amount = 200_000_000) {
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
      if (!r.ok) throw Error(d.error);
      setMessage(d.message || 'کیف پول شارژ شد.');
      await load(slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOrder() {
    if (!currentProject) return;
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const payload =
        mode === 'primary'
          ? { action: 'primary_buy', projectSlug: currentProject.slug, shares }
          : {
              action: 'place_order',
              projectSlug: currentProject.slug,
              side: mode === 'secondary_buy' ? 'buy' : 'sell',
              shares,
              priceToman,
            };
      const r = await fetch('/api/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw Error(d.error);
      setMessage(d.message || 'سفارش با موفقیت انجام شد.');
      await load(currentProject.slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fillOrder(orderId: string, maxShares: number) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch('/api/market', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'fill_order', orderId, shares: maxShares }),
      });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw Error(d.error);
      setMessage(d.message || 'معامله انجام شد.');
      await load(slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelOrder(orderId: string) {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      const r = await fetch(`/api/market?id=${encodeURIComponent(orderId)}`, { method: 'DELETE' });
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw Error(d.error);
      setMessage(d.message || 'سفارش لغو شد.');
      await load(slug);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (unauth) {
    return (
      <div className="empty-state">
        <h2>برای خرید و فروش سهام و دسترسی به بازار ثانویه وارد شوید</h2>
        <p>با ورود یا ثبت‌نام، کیف پول ۵۰۰ میلیون تومانی شما فعال می‌شود و می‌توانید سهام تمام پروژه‌ها را خرید و فروش کنید.</p>
        <Link className="button button-red" href="/auth">
          ورود یا ثبت‌نام حساب کاربری <ArrowLeft size={16} />
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="market-panel">
        <p>در حال بارگذاری تابلوی معاملات و کیف پول شما…</p>
        {error && <p className="form-message error">{error}</p>}
      </div>
    );
  }

  const unitPrice = mode === 'primary' ? (currentProject?.tokenPriceCurrent ?? 525_000) : priceToman;
  const totalValue = Math.max(0, shares) * Math.max(0, unitPrice);
  const bestAsk = data.orderBook.sells[0]?.priceToman ?? null;
  const bestBid = data.orderBook.buys[0]?.priceToman ?? null;

  return (
    <div className="secondary-market-shell">
      {/* Top Wallet & Holdings Summary Strip */}
      <div className="market-summary-grid">
        <div className="wallet-stat-card">
          <span>
            <Wallet size={14} /> موجودی نقد کیف پول ({data.actor.displayName})
          </span>
          <strong>{fmt(data.wallet.balanceToman)} تومان</strong>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="button button-ghost button-small"
              disabled={busy}
              onClick={() => void topUpWallet(200_000_000)}
            >
              <PlusCircle size={14} /> افزایش موجودی (+۲۰۰ میلیون)
            </button>
            <button type="button" className="button button-ghost button-small" onClick={() => void load(slug)}>
              <RefreshCw size={13} /> بروزرسانی تابلو
            </button>
          </div>
        </div>

        <div>
          <span>
            <Layers3 size={14} /> دارایی شما در «{currentProject?.name ?? '—'}»
          </span>
          <strong>{fmt(currentHolding?.shares ?? 0)} سهم قابل معامله</strong>
          <small>
            {currentHolding?.lockedShares
              ? `${fmt(currentHolding.lockedShares)} سهم در سفارش فروش باز · میانگین خرید: ${fmt(currentHolding.avgPriceToman)} تومان`
              : currentHolding?.shares
                ? `میانگین قیمت خرید: ${fmt(currentHolding.avgPriceToman)} تومان`
                : 'هنوز سهمی از این پروژه ندارید'}
          </small>
        </div>

        <div>
          <span>
            <ArrowDownUp size={14} /> قیمت تابلو ({currentProject?.tokenSymbol})
          </span>
          <strong>{fmt(currentProject?.tokenPriceCurrent ?? 0)} تومان</strong>
          <small>
            بهترین خرید: {bestBid ? `${fmt(bestBid)} تومان` : '—'} · بهترین فروش:{' '}
            {bestAsk ? `${fmt(bestAsk)} تومان` : '—'}
          </small>
        </div>
      </div>

      {/* Main Two-Column Trading Terminal */}
      <div className="market-layout">
        {/* Left / Right Panel: Order Entry Form */}
        <section className="market-panel">
          <div className="panel-title-row">
            <div>
              <span className="mini-label">میز معاملات سهام پروژه</span>
              <h2>خرید عرضهٔ اولیه و بازار ثانویه</h2>
            </div>
            <Coins size={22} color="var(--nitro-orange)" />
          </div>

          <label className="form-field">
            <span>انتخاب پروژهٔ سرمایه‌گذاری</span>
            <select
              disabled={!!project}
              value={currentProject?.slug ?? ''}
              onChange={(e) => handleProjectChange(e.target.value)}
            >
              {data.projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} ({p.tokenSymbol}) — {fmt(p.tokenPriceCurrent)} تومان
                </option>
              ))}
            </select>
          </label>

          <div className="order-tabs" role="tablist" aria-label="نوع معامله">
            <button
              type="button"
              className={mode === 'primary' ? 'active' : ''}
              onClick={() => {
                setMode('primary');
                if (currentProject) setPriceToman(currentProject.tokenPriceCurrent);
              }}
            >
              <ShoppingCart size={14} /> خرید مستقیم از پروژه
            </button>
            <button
              type="button"
              className={mode === 'secondary_buy' ? 'active' : ''}
              onClick={() => {
                setMode('secondary_buy');
                if (bestAsk) setPriceToman(bestAsk);
              }}
            >
              <TrendingUp size={14} /> سفارش خرید ثانویه
            </button>
            <button
              type="button"
              className={mode === 'secondary_sell' ? 'active' : ''}
              onClick={() => {
                setMode('secondary_sell');
                if (bestBid) setPriceToman(bestBid);
              }}
            >
              <TrendingDown size={14} /> فروش سهام من
            </button>
          </div>

          <div className="form-grid-two">
            <label className="form-field">
              <span>تعداد سهام</span>
              <input
                type="number"
                min={1}
                max={100000}
                value={shares}
                onChange={(e) => setShares(Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <label className="form-field">
              <span>{mode === 'primary' ? 'قیمت مصوب هر سهم (تومان)' : 'قیمت پیشنهادی هر سهم (تومان)'}</span>
              <input
                type="number"
                min={50000}
                step={5000}
                disabled={mode === 'primary'}
                value={mode === 'primary' ? (currentProject?.tokenPriceCurrent ?? 525_000) : priceToman}
                onChange={(e) => setPriceToman(Math.max(50000, Number(e.target.value) || 0))}
              />
            </label>
          </div>

          {mode === 'secondary_sell' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 12 }}>
              <span>سهام قابل فروش شما: <strong>{fmt(currentHolding?.shares ?? 0)} سهم</strong></span>
              {(currentHolding?.shares ?? 0) > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setShares(currentHolding!.shares)}
                >
                  انتخاب کل موجودی ({fmt(currentHolding!.shares)} سهم)
                </button>
              )}
            </div>
          )}

          <div className="market-total">
            <span>مبلغ کل معامله:</span>
            <strong>{fmt(totalValue)} تومان</strong>
            <small>
              {mode === 'primary'
                ? 'صدور آنی سهام از موجودی پروژه و ثبت مستقیم در پرتفوی شما'
                : mode === 'secondary_buy'
                  ? 'در صورت هم‌پوشانی با قیمت فروشندگان تابلو، بلافاصله معامله می‌شود و مابقی در صف خرید می‌ماند.'
                  : 'در صورت هم‌پوشانی با قیمت خریداران تابلو، بلافاصله نقد می‌شود و مابقی در صف فروش می‌ماند.'}
            </small>
          </div>

          <button
            type="button"
            className="button button-red button-wide"
            style={{ marginTop: 14 }}
            disabled={busy || !currentProject || shares < 1}
            onClick={() => void submitOrder()}
          >
            {busy
              ? 'در حال ثبت در سرور…'
              : mode === 'primary'
                ? `خرید قطعی ${fmt(shares)} سهم از پروژه`
                : mode === 'secondary_buy'
                  ? `ثبت سفارش خرید ${fmt(shares)} سهم در بازار ثانویه`
                  : `ثبت سفارش فروش ${fmt(shares)} سهم در بازار ثانویه`}{' '}
            <ArrowLeft size={16} />
          </button>

          {message && (
            <p className="sim-success" role="status" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
              <CheckCircle2 size={16} /> {message}
            </p>
          )}
          {error && (
            <p className="sim-error" role="alert" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}

          {/* User's All Project Holdings Quick Switcher */}
          <div style={{ marginTop: 24, borderTop: '1px solid var(--hairline)', paddingTop: 16 }}>
            <h3 style={{ fontSize: 14, margin: '0 0 10px' }}>دارایی‌های سهام شما در کل پروژه‌ها</h3>
            {data.holdings.filter((h) => h.shares > 0 || h.lockedShares > 0).length === 0 ? (
              <p className="market-helper">هنوز سهمی خریداری نکرده‌اید. از فرم بالا اولین خرید خود را ثبت کنید.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {data.holdings
                  .filter((h) => h.shares > 0 || h.lockedShares > 0)
                  .map((h) => {
                    const p = data.projects.find((item) => item.slug === h.projectSlug);
                    return (
                      <div
                        key={h.id}
                        className="project-admin-row"
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                      >
                        <div>
                          <strong>{p?.name ?? h.projectSlug}</strong>
                          <small style={{ display: 'block' }}>
                            آزاد: {fmt(h.shares)} سهم · در سفارش فروش: {fmt(h.lockedShares)} سهم · میانگین خرید:{' '}
                            {fmt(h.avgPriceToman)} تومان
                          </small>
                        </div>
                        <button
                          type="button"
                          className="button button-ghost button-small"
                          onClick={() => {
                            handleProjectChange(h.projectSlug);
                            setMode('secondary_sell');
                            setShares(Math.max(1, h.shares));
                          }}
                        >
                          فروش در بازار ثانویه
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </section>

        {/* Right / Left Panel: Live Secondary Market Order Book & Recent Trades */}
        <section className="market-panel">
          <div className="panel-title-row market-order-title">
            <div>
              <span className="mini-label">دفتر سفارش‌های زنده · {currentProject?.name}</span>
              <h2>بازار ثانویه</h2>
            </div>
            <span className="market-status">
              <i /> متصل به موتور معاملاتی سرور
            </span>
          </div>

          <p className="market-helper">
            می‌توانید روی دکمهٔ «خرید آنی» در ردیف فروشندگان یا «فروش آنی» در ردیف خریداران کلیک کنید تا معامله در لحظه انجام شود.
          </p>

          {/* Sell Orders (Asks) */}
          <h3 style={{ fontSize: 13, marginTop: 18, marginBottom: 8, color: 'var(--brick)' }}>
            صف فروشندگان سهام (عرضه در بازار ثانویه)
          </h3>
          <div className="order-book">
            <div className="order-book-head">
              <span>نوع</span>
              <span>عرضه‌کننده</span>
              <span>تعداد سهام</span>
              <span>قیمت واحد (تومان)</span>
              <span>عملیات</span>
            </div>
            {data.orderBook.sells.length === 0 ? (
              <div style={{ padding: 14, fontSize: 11, color: 'var(--muted)' }}>
                در حال حاضر سفارش فروشی در این پروژه ثبت نشده است.
              </div>
            ) : (
              data.orderBook.sells.map((o) => (
                <div className="order-book-row" key={o.id}>
                  <span className="negative" style={{ fontWeight: 800 }}>
                    فروش
                  </span>
                  <span>{o.userDisplayName}</span>
                  <strong>{fmt(o.remainingShares)} سهم</strong>
                  <strong>{fmt(o.priceToman)}</strong>
                  <div>
                    {o.userId === data.actor.userId ? (
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() => void cancelOrder(o.id)}
                      >
                        <XCircle size={13} /> لغو سفارش من
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-red button-small"
                        style={{ padding: '5px 10px', fontSize: 11 }}
                        disabled={busy}
                        onClick={() => void fillOrder(o.id, o.remainingShares)}
                      >
                        خرید آنی ({fmt(o.remainingShares)} سهم)
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Buy Orders (Bids) */}
          <h3 style={{ fontSize: 13, marginTop: 22, marginBottom: 8, color: 'var(--profit-green)' }}>
            صف خریداران سهام (تقاضا در بازار ثانویه)
          </h3>
          <div className="order-book">
            <div className="order-book-head">
              <span>نوع</span>
              <span>متقاضی</span>
              <span>تعداد سهام</span>
              <span>قیمت پیشنهادی (تومان)</span>
              <span>عملیات</span>
            </div>
            {data.orderBook.buys.length === 0 ? (
              <div style={{ padding: 14, fontSize: 11, color: 'var(--muted)' }}>
                در حال حاضر سفارش خریدی در این پروژه ثبت نشده است.
              </div>
            ) : (
              data.orderBook.buys.map((o) => (
                <div className="order-book-row" key={o.id}>
                  <span className="positive" style={{ fontWeight: 800 }}>
                    خرید
                  </span>
                  <span>{o.userDisplayName}</span>
                  <strong>{fmt(o.remainingShares)} سهم</strong>
                  <strong>{fmt(o.priceToman)}</strong>
                  <div>
                    {o.userId === data.actor.userId ? (
                      <button
                        type="button"
                        className="text-button"
                        disabled={busy}
                        onClick={() => void cancelOrder(o.id)}
                      >
                        <XCircle size={13} /> لغو سفارش من
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="button button-ghost button-small"
                        style={{ padding: '5px 10px', fontSize: 11 }}
                        disabled={busy || (currentHolding?.shares ?? 0) < 1}
                        onClick={() =>
                          void fillOrder(o.id, Math.min(o.remainingShares, currentHolding?.shares ?? o.remainingShares))
                        }
                      >
                        فروش آنی به خریدار
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* User's Active & Historical Orders */}
          {data.myOrders.length > 0 && (
            <div className="recent-trades">
              <h3>سفارش‌های ثبت‌شدهٔ من</h3>
              {data.myOrders.slice(0, 8).map((o) => {
                const pName = data.projects.find((p) => p.slug === o.projectSlug)?.name ?? o.projectSlug;
                return (
                  <div key={o.id}>
                    <span>
                      <strong>{o.side === 'buy' ? 'خرید' : 'فروش'}</strong> · {pName} ({fmt(o.initialShares)} سهم به قیمت{' '}
                      {fmt(o.priceToman)} تومان)
                    </span>
                    <small>
                      {o.status === 'open'
                        ? `فعال (${fmt(o.remainingShares)} سهم باقی‌مانده)`
                        : o.status === 'filled'
                          ? 'تکمیل‌شده'
                          : 'لغوشده'}
                    </small>
                    {o.status === 'open' ? (
                      <button type="button" className="text-button" disabled={busy} onClick={() => void cancelOrder(o.id)}>
                        لغو
                      </button>
                    ) : (
                      <small>{new Date(o.createdAt).toLocaleTimeString('fa-IR')}</small>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent Trades */}
          <div className="recent-trades">
            <h3>
              <History size={15} style={{ verticalAlign: 'middle', marginLeft: 5 }} /> آخرین معاملات انجام‌شده در این پروژه
            </h3>
            {data.recentTrades.length === 0 ? (
              <p className="market-helper">هنوز معامله‌ای در این پروژه ثبت نشده است.</p>
            ) : (
              data.recentTrades.slice(0, 8).map((t) => (
                <div key={t.id}>
                  <span>
                    {t.kind === 'primary' ? 'عرضهٔ اولیه پروژه' : 'معاملهٔ بازار ثانویه'} ·{' '}
                    <strong>{fmt(t.shares)} سهم</strong>
                  </span>
                  <strong>{fmt(t.priceToman)} تومان</strong>
                  <small>{new Date(t.createdAt).toLocaleString('fa-IR')}</small>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
