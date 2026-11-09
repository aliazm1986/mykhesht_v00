'use client';

import { readJson } from '@/lib/api-client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowDownUp, ArrowLeft, Bell, Check, CheckCircle2, History, Layers3, Save, ShoppingCart } from 'lucide-react';

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

type HoldingItem = {
  id: string;
  projectSlug: string;
  shares: number;
  lockedShares: number;
  avgPriceToman: number;
};

type MarketProject = {
  slug: string;
  name: string;
  tokenSymbol: string;
  tokenPriceCurrent: number;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href: string;
};

const fmt = (v: number) => Math.round(v).toLocaleString('fa-IR');

export function AutoInvestPanel() {
  const [enabled, setEnabled] = useState(true);
  const [trigger, setTrigger] = useState('all');
  const [tracks, setTracks] = useState<string[]>(['مالی', 'گزارش پیشرفت']);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [userId, setUserId] = useState<string>('');
  const [projects, setProjects] = useState<MarketProject[]>([]);
  const [holdings, setHoldings] = useState<HoldingItem[]>([]);
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
  const [recentTrades, setRecentTrades] = useState<TradeItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadCustomerData = useCallback(async () => {
    try {
      const [rulesRes, mktRes, notifRes] = await Promise.all([
        fetch('/api/review-rules', { cache: 'no-store' }),
        fetch('/api/market', { cache: 'no-store' }),
        fetch('/api/member?section=notifications', { cache: 'no-store' }),
      ]);

      if (rulesRes.ok) {
        const d = await readJson<{ rule?: { enabled: boolean; trigger: string; tracks: string[] } }>(rulesRes);
        if (d.rule) {
          setEnabled(d.rule.enabled);
          setTrigger(d.rule.trigger);
          setTracks(d.rule.tracks.length ? d.rule.tracks : ['مالی']);
        }
      }

      if (mktRes.ok) {
        const md = await readJson<{
          actor?: { userId: string };
          projects?: MarketProject[];
          holdings?: HoldingItem[];
          myOrders?: OrderItem[];
          recentTrades?: TradeItem[];
        }>(mktRes);
        if (md.actor) setUserId(md.actor.userId);
        if (md.projects) setProjects(md.projects);
        if (md.holdings) setHoldings(md.holdings);
        if (md.myOrders) setMyOrders(md.myOrders);
        if (md.recentTrades) setRecentTrades(md.recentTrades);
      }

      if (notifRes.ok) {
        const nd = await readJson<{ ok: boolean; data?: NotificationItem[] }>(notifRes);
        if (nd.ok && nd.data) setNotifications(nd.data);
      }
    } catch {
      // ignore guest errors
    }
  }, []);

  useEffect(() => {
    void loadCustomerData();
    const onMarketUpdate = () => void loadCustomerData();
    window.addEventListener('khesht:market-updated', onMarketUpdate);
    window.addEventListener('focus', onMarketUpdate);
    return () => {
      window.removeEventListener('khesht:market-updated', onMarketUpdate);
      window.removeEventListener('focus', onMarketUpdate);
    };
  }, [loadCustomerData]);

  async function save() {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/review-rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          enabled,
          trigger,
          tracks: tracks.map((t) => (t === 'گزارش پیشرفت' ? 'داده' : t)),
        }),
      });
      const d = await readJson<{ error?: string }>(r);
      if (!r.ok) throw Error(d.error || 'خطا در ذخیرهٔ تنظیمات');
      setMessage('تنظیمات اعلان و پیگیری پروژه‌های شما با موفقیت ذخیره شد.');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const customerHistory = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      detail: string;
      dateLabel: string;
      badge: string;
      href: string;
      tone: 'green' | 'brick' | 'navy';
    }> = [];

    for (const t of recentTrades) {
      if (!userId || t.buyerId === userId || t.sellerId === userId) {
        const p = projects.find((item) => item.slug === t.projectSlug);
        const pName = p?.name ?? t.projectSlug;
        const isBuyer = !userId || t.buyerId === userId;
        list.push({
          id: `tr-${t.id}`,
          title: `${isBuyer ? 'خرید' : 'فروش'} ${fmt(t.shares)} سهم از «${pName}»`,
          detail: `${t.kind === 'primary' ? 'خرید مستقیم از عرضهٔ پروژه' : 'معامله در تابلوی بازار ثانویه'} · قیمت هر سهم: ${fmt(t.priceToman)} تومان · مبلغ کل: ${fmt(t.totalToman)} تومان`,
          dateLabel: new Date(t.createdAt).toLocaleString('fa-IR'),
          badge: isBuyer ? 'خرید سهام' : 'فروش سهام',
          href: `/projects/${t.projectSlug}`,
          tone: isBuyer ? 'green' : 'brick',
        });
      }
    }

    for (const o of myOrders) {
      const p = projects.find((item) => item.slug === o.projectSlug);
      const pName = p?.name ?? o.projectSlug;
      list.push({
        id: `ord-${o.id}`,
        title: `سفارش ${o.side === 'buy' ? 'خرید' : 'فروش'} در بازار ثانویه (${pName})`,
        detail: `تعداد: ${fmt(o.initialShares)} سهم · قیمت پیشنهادی: ${fmt(o.priceToman)} تومان · وضعیت: ${o.status === 'open' ? 'فعال در تابلو' : o.status === 'filled' ? 'تکمیل‌شده' : 'لغوشده'}`,
        dateLabel: new Date(o.createdAt).toLocaleString('fa-IR'),
        badge: 'سفارش بازار ثانویه',
        href: `/market/${o.projectSlug}`,
        tone: 'navy',
      });
    }

    for (const n of notifications) {
      list.push({
        id: `notif-${n.id}`,
        title: n.title,
        detail: n.body,
        dateLabel: n.createdAt,
        badge: 'رویداد حساب',
        href: n.href || '/dashboard',
        tone: 'green',
      });
    }

    return list;
  }, [recentTrades, myOrders, notifications, projects, userId]);

  const activeHoldings = holdings.filter((h) => h.shares > 0 || h.lockedShares > 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 22, alignItems: 'start' }}>
      {/* Left/Main Column: Customer's Real Action & Transaction History */}
      <section className="dashboard-panel" style={{ padding: 24 }}>
        <div className="panel-title-row" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <span className="mini-label">
              <History size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> کارنامه و سوابق معاملاتی مشتری
            </span>
            <h2 style={{ margin: '4px 0 0', fontSize: 20 }}>سوابق خرید، فروش و اقدامات انجام‌شدهٔ شما</h2>
          </div>
          <Link href="/dashboard" className="button button-ghost button-small">
            مشاهدهٔ داشبورد کامل <ArrowLeft size={14} />
          </Link>
        </div>

        {/* Summary of Active Holdings */}
        {activeHoldings.length > 0 && (
          <div
            style={{
              background: 'var(--ice-white)',
              border: '1px solid var(--hairline)',
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy)', marginBottom: 8 }}>
              <Layers3 size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> سهام فعلی شما در پروژه‌ها:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activeHoldings.map((h) => {
                const p = projects.find((item) => item.slug === h.projectSlug);
                const tot = h.shares + h.lockedShares;
                return (
                  <Link
                    key={h.id}
                    href={`/projects/${h.projectSlug}`}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 999,
                      background: 'rgba(30, 107, 82, .1)',
                      color: 'var(--profit-green)',
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {p?.name ?? h.projectSlug}: {fmt(tot)} سهم
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {customerHistory.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            <p>هنوز سابقهٔ خرید یا سفارشی در حساب شما ثبت نشده است. با اولین خرید سهام یا معامله در بازار ثانویه، تمام سوابق شما در این بخش فهرست می‌شود.</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <Link href="/projects" className="button button-red button-small">
                <ShoppingCart size={14} /> خرید سهام از پروژه‌ها
              </Link>
              <Link href="/market" className="button button-ghost button-small">
                <ArrowDownUp size={14} /> ورود به بازار ثانویه
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxHeight: 460, overflowY: 'auto' }}>
            {customerHistory.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="project-admin-row"
                style={{
                  display: 'block',
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid var(--hairline)',
                  background: 'var(--ice-white)',
                  textDecoration: 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--navy)', fontSize: 14 }}>{item.title}</strong>
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
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 4px', lineHeight: 1.6 }}>{item.detail}</p>
                <small style={{ fontSize: 11, color: 'var(--muted)', opacity: 0.8 }}>{item.dateLabel}</small>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Right Column: Clean Notification & Project Alert Settings Card */}
      <section className="dashboard-panel" style={{ padding: 24 }}>
        <span className="mini-label">
          <Bell size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> تنظیمات اطلاع‌رسانی حساب
        </span>
        <h2 style={{ margin: '4px 0 8px', fontSize: 20 }}>مدیریت اعلان‌های پیشرفت پروژه و واریز سود</h2>
        <p style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 16 }}>
          مشخص کنید برای کدام رویدادهای پروژه‌های خریداری‌شده (مانند پیشرفت مراحل ساخت، واریز عواید به کیف پول اجاره یا تطبیق سفارش در بازار ثانویه) اعلان دریافت کنید.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid var(--hairline)',
            background: 'var(--ice-white)',
            marginBottom: 14,
          }}
        >
          <div>
            <strong style={{ fontSize: 13, display: 'block', color: 'var(--navy)' }}>دریافت اعلان‌های حساب کاربری</strong>
            <small style={{ fontSize: 11, color: 'var(--muted)' }}>نمایش آنی پیام‌های خرید، فروش و واریز اجاره</small>
          </div>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ width: 20, height: 20, accentColor: 'var(--brick)', cursor: 'pointer' }}
          />
        </div>

        <label className="form-field" style={{ marginBottom: 14 }}>
          <span>بخش مورد نظر جهت اطلاع‌رسانی</span>
          <select value={trigger} onChange={(e) => setTrigger(e.target.value)}>
            {Object.entries({
              all: 'تمامی رویدادها (خرید، فروش، کیف پول اجاره و مراحل ساخت)',
              financial_report: 'گزارش‌های مالی و واریز سود اجاره',
              data_room: 'بارگذاری مستندات جدید در اتاق داده',
              independent_review: 'گزارش‌های ارزیابی و کارشناسی رسمی',
            }).map(([v, t]) => (
              <option key={v} value={v}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8, color: 'var(--navy)' }}>
            موضوعات مورد علاقه برای پیگیری:
          </span>
          <div className="criterion-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['مالی', 'گزارش پیشرفت', 'کارشناسی', 'حقوقی'].map((t) => (
              <button
                type="button"
                className={tracks.includes(t) ? 'active' : ''}
                key={t}
                onClick={() => setTracks((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]))}
              >
                {tracks.includes(t) && <Check size={14} />} {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="button button-red button-wide"
          disabled={busy || !tracks.length}
          onClick={() => void save()}
        >
          <Save size={15} /> {busy ? 'در حال ذخیره…' : 'ذخیرهٔ تنظیمات اطلاع‌رسانی'}
        </button>

        {message && (
          <p role="status" className="sim-success" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
            <CheckCircle2 size={15} /> {message}
          </p>
        )}
      </section>
    </div>
  );
}
