"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  Archive,
  ArrowDownUp,
  Award,
  CheckCircle2,
  Coins,
  DatabaseBackup,
  FilePlus2,
  KeyRound,
  Layers3,
  LifeBuoy,
  LogIn,
  PlusCircle,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
  UserPlus,
  UsersRound,
  Wallet,
  XCircle,
} from "lucide-react";
import { BackupRetention } from "./BackupRetention";
import { ProjectMembers } from "./ProjectMembers";
import { OperationalReadiness } from "./OperationalReadiness";
import { formatCompactToman, formatToman, tiers, type InvestorTier } from "@/lib/data";
import type { ProjectDefinition } from "@/lib/pilot-domain";

type Entry = { definition: ProjectDefinition; revision: number; archived: boolean };

type EnrichedUser = {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  mobile: string;
  active: boolean;
  walletBalanceToman: number;
  portfolioValueToman: number;
  totalSharesOwned: number;
  holdingsCount: number;
  openOrdersCount: number;
  tierId: InvestorTier;
  tierName: string;
  tierColor: string;
  holdings: Array<{
    projectSlug: string;
    projectName: string;
    shares: number;
    lockedShares: number;
    avgPriceToman: number;
  }>;
};

type MarketOrderItem = {
  id: string;
  userId: string;
  userDisplayName: string;
  projectSlug: string;
  side: "buy" | "sell";
  priceToman: number;
  initialShares: number;
  remainingShares: number;
  status: string;
  createdAt: number;
};

type MarketTradeItem = {
  id: string;
  projectSlug: string;
  buyerId: string;
  sellerId: string;
  shares: number;
  priceToman: number;
  totalToman: number;
  kind: string;
  createdAt: number;
};

type AdminTicket = {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  createdAt: number;
  replies: Array<{ id: string; authorName: string; message: string; createdAt: number }>;
};

type Ops = {
  users: EnrichedUser[];
  marketSummary?: {
    totalUsers: number;
    totalWalletsToman: number;
    totalPortfolioToman: number;
    totalSharesIssued: number;
    openOrdersCount: number;
    totalTradesCount: number;
    openOrders: MarketOrderItem[];
    recentTrades: MarketTradeItem[];
  };
  tickets?: AdminTicket[];
  maintenance: Array<{ id: string; state: string; backupId: string | null; startedAt: number; finishedAt: number | null }>;
  logs: Array<{ id: string; action: string; targetId: string; createdAt: number }>;
  backups: Array<{ id: string; checksum: string; createdAt: number; sizeBytes: number }>;
  health: { database: string; storage: string; checkedAt: number };
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = (await r.json()) as T & { error?: string };
  if (!r.ok) throw Error(d.error || "عملیات انجام نشد.");
  return d;
}

const roles: Record<string, string> = {
  investor: "سرمایه‌گذار فعال",
  admin: "مدیر کل سامانه (Admin)",
  expert: "کارشناس ارزیابی",
  project_manager: "مدیر پروژه",
  independent_reviewer: "بازبین مستقل",
  viewer: "بازدیدکننده",
};

const fresh: Entry = {
  definition: {
    slug: "",
    name: "",
    location: "",
    description: "",
    outcome: "",
    investmentModel: "flip",
    type: "فروش",
    horizonMonths: 12,
    progress: 0,
    riskLevel: "متوسط",
    latitude: null,
    longitude: null,
    image: "/pilot-assets/niavaran-stage-2.webp",
    risks: [],
  },
  revision: 0,
  archived: false,
};

export function AdminWorkspace() {
  const [ops, setOps] = useState<Ops | null>(null);
  const [projects, setProjects] = useState<Entry[]>([]);
  const [edit, setEdit] = useState<Entry>(fresh);
  const [tab, setTab] = useState<string>("users");
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  // New user creation state
  const [newUserForm, setNewUserForm] = useState({
    displayName: "",
    email: "",
    mobile: "",
    password: "Khesht1405!",
    role: "investor",
    tierId: "silver",
    initialBalanceToman: 500_000_000,
  });

  // Share allocation state
  const [allocForm, setAllocForm] = useState({
    userId: "",
    projectSlug: "niavaran-flip",
    shares: 10,
  });

  // Ticket replies state
  const [ticketRepliesText, setTicketRepliesText] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      setError("");
      const [o, p] = await Promise.all([
        api<Ops>("/api/admin/operations"),
        api<{ projects: Entry[] }>("/api/projects"),
      ]);
      setOps(o);
      setProjects(p.projects);
      if (p.projects.length > 0 && !edit.definition.slug) {
        setEdit(structuredClone(p.projects[0]));
      }
      if (o.users.length > 0 && !allocForm.userId) {
        setAllocForm((prev) => ({ ...prev, userId: o.users[0].userId }));
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [edit.definition.slug, allocForm.userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const change = (key: keyof ProjectDefinition, value: unknown) =>
    setEdit((e) => ({ ...e, definition: { ...e.definition, [key]: value } }));

  async function saveProject(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ project: Entry }>("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(edit),
      });
      setEdit(d.project);
      setMessage(`پروژهٔ «${d.project.definition.name}» با موفقیت در سرور ذخیره و بروزرسانی شد.`);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create_user",
          ...newUserForm,
        }),
      });
      setMessage(d.message);
      setNewUserForm({
        displayName: "",
        email: "",
        mobile: "",
        password: "Khesht1405!",
        role: "investor",
        tierId: "silver",
        initialBalanceToman: 500_000_000,
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateUser(
    userId: string,
    patch: { role?: string; tierId?: string; walletBalanceToman?: number; active?: boolean },
  ) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "update_user",
          userId,
          ...patch,
        }),
      });
      setMessage(d.message);
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAllocateShares(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "allocate_shares",
          ...allocForm,
        }),
      });
      setMessage(d.message);
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDistributeRental(projectSlug = "all") {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "distribute_rental",
          projectSlug,
        }),
      });
      setMessage(d.message);
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "cancel_order",
          orderId,
        }),
      });
      setMessage(d.message);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReplyTicket(ticketId: string) {
    const text = (ticketRepliesText[ticketId] ?? "").trim();
    if (!text) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "reply_ticket",
          ticketId,
          message: text,
          status: "answered",
        }),
      });
      setMessage(d.message);
      setTicketRepliesText((prev) => ({ ...prev, [ticketId]: "" }));
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSwitchUser(userId: string) {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const d = await api<{ message: string }>("/api/admin/operations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "switch_user",
          userId,
        }),
      });
      setMessage(d.message);
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      window.location.assign("/dashboard");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function backup() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const created = await api<{ id: string }>("/api/admin/backups", { method: "POST" });
      await api("/api/admin/backups", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: created.id }),
      });
      setMessage("پشتیبان کامل دیتابیس و اسناد ساخته و تأیید شد.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error && !ops) {
    return (
      <div className="empty-state" style={{ padding: 36 }}>
        <h2>دسترسی به پنل مدیریت نیازمند حساب مدیر (Admin) است</h2>
        <p style={{ margin: "10px 0 18px" }}>{error}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth" className="button button-red">
            ورود با حساب مدیر (owner@khesht.test)
          </Link>
          <Link href="/dashboard" className="button button-ghost">
            بازگشت به داشبورد کاربری
          </Link>
        </div>
      </div>
    );
  }

  const mkt = ops?.marketSummary;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* Top Multi-User & Platform KPI Summary Strip */}
      {ops && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div className="dashboard-card primary">
            <span>
              <UsersRound size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} /> کل کاربران فعال سامانه
            </span>
            <strong>{formatToman(mkt?.totalUsers ?? ops.users.length)} کاربر</strong>
            <small>پشتیبانی کامل چندکاربره و تفکیک کیف پول‌ها</small>
          </div>
          <div className="dashboard-card">
            <span>
              <Wallet size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} /> مجموع موجودی نقد کاربران
            </span>
            <strong>{formatCompactToman(mkt?.totalWalletsToman ?? 0)} تومان</strong>
            <small>در کیف پول‌های معاملاتی کاربران</small>
          </div>
          <div className="dashboard-card">
            <span>
              <Coins size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} /> ارزش کل سهام تخصیص‌یافته
            </span>
            <strong style={{ color: "var(--profit-green)" }}>
              {formatCompactToman(mkt?.totalPortfolioToman ?? 0)} تومان
            </strong>
            <small>{formatToman(mkt?.totalSharesIssued ?? 0)} سهم فعال در پرتفوی کاربران</small>
          </div>
          <div className="dashboard-card">
            <span>
              <ArrowDownUp size={14} style={{ verticalAlign: "middle", marginLeft: 4 }} /> سفارش‌ها و معاملات بازار ثانویه
            </span>
            <strong>{formatToman(mkt?.openOrdersCount ?? 0)} سفارش باز</strong>
            <small>{formatToman(mkt?.totalTradesCount ?? 0)} معاملهٔ ثبت‌شده در سرور</small>
          </div>
        </div>
      )}

      {message && (
        <p className="sim-success" role="status" style={{ padding: 12, borderRadius: 12 }}>
          <CheckCircle2 size={16} /> {message}
        </p>
      )}
      {error && (
        <p className="sim-error" role="alert" style={{ padding: 12, borderRadius: 12 }}>
          {error}
        </p>
      )}

      <section className="admin-workspace">
        <aside className="admin-nav">
          <span className="mini-label">مرکز فرماندهی ادمین</span>
          <h2>پنل مدیریت خشت</h2>
          {(
            [
              ["users", "کاربران، کیف پول و سطوح", UsersRound],
              ["projects", "مدیریت پروژه‌ها و سود اجاره", FilePlus2],
              ["market", "نظارت بازار ثانویه و سفارش‌ها", ArrowDownUp],
              ["members", "دسترسی اختصاصی پرونده‌ها", ShieldCheck],
              ["support", "مدیریت تیکت‌های پشتیبانی", LifeBuoy],
              ["readiness", "آمادگی و کنترل‌های سامانه", Activity],
              ["audit", "لاگ رویدادها و ممیزی", Layers3],
              ["health", "سلامت سرویس و پشتیبان‌گیری", DatabaseBackup],
            ] as const
          ).map(([key, label, Icon]) => (
            <button key={key} type="button" className={tab === key ? "active" : ""} onClick={() => setTab(key)}>
              <Icon size={16} /> {label}
            </button>
          ))}
        </aside>

        <div className="admin-main">
          {!ops ? (
            <div className="dashboard-panel" style={{ padding: 32, textAlign: "center" }}>
              <p>در حال بارگذاری اطلاعات پنل مدیریت از سرور…</p>
            </div>
          ) : (
            <>
              {/* TAB 1: MULTI-USER MANAGEMENT, WALLETS, TIERS & SHARE ALLOCATION */}
              {tab === "users" && (
                <div style={{ display: "grid", gap: 20 }}>
                  {/* Top Action Row: Create New User + Direct Share Allocation */}
                  <div className="dashboard-grid">
                    <form className="dashboard-panel mvp-form" onSubmit={handleCreateUser}>
                      <span className="mini-label">افزودن عضو جدید به سامانه</span>
                      <h3 style={{ margin: "4px 0 10px" }}>
                        <UserPlus size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
                        ساخت کاربر جدید (با کیف پول و سطح کاربری)
                      </h3>
                      <div className="form-grid-two">
                        <label>
                          نام و نام خانوادگی
                          <input
                            required
                            minLength={2}
                            placeholder="مثلاً: رضا علوی"
                            value={newUserForm.displayName}
                            onChange={(e) => setNewUserForm({ ...newUserForm, displayName: e.target.value })}
                          />
                        </label>
                        <label>
                          ایمیل ورود
                          <input
                            required
                            type="email"
                            dir="ltr"
                            placeholder="reza@khesht.ir"
                            value={newUserForm.email}
                            onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          />
                        </label>
                        <label>
                          شمارهٔ موبایل
                          <input
                            dir="ltr"
                            placeholder="09120000000"
                            value={newUserForm.mobile}
                            onChange={(e) => setNewUserForm({ ...newUserForm, mobile: e.target.value })}
                          />
                        </label>
                        <label>
                          گذرواژهٔ ورود
                          <input
                            required
                            dir="ltr"
                            minLength={6}
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                          />
                        </label>
                        <label>
                          نقش سیستمی
                          <select
                            value={newUserForm.role}
                            onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                          >
                            {Object.entries(roles).map(([v, l]) => (
                              <option key={v} value={v}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          سطح کاربری (Tier)
                          <select
                            value={newUserForm.tierId}
                            onChange={(e) => setNewUserForm({ ...newUserForm, tierId: e.target.value })}
                          >
                            {tiers.map((t) => (
                              <option key={t.id} value={t.id}>
                                سطح {t.name} ({t.feeDiscountPercent}٪ تخفیف کارمزد)
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label>
                        موجودی اولیهٔ کیف پول (تومان)
                        <input
                          required
                          type="number"
                          min={0}
                          step={10_000_000}
                          value={newUserForm.initialBalanceToman}
                          onChange={(e) =>
                            setNewUserForm({ ...newUserForm, initialBalanceToman: Number(e.target.value) || 0 })
                          }
                        />
                      </label>
                      <button className="button button-red" disabled={busy}>
                        <UserPlus size={15} /> ساخت حساب کاربری و شارژ کیف پول
                      </button>
                    </form>

                    {/* Direct Share Allocation & Rental Distribution */}
                    <div style={{ display: "grid", gap: 16 }}>
                      <form className="dashboard-panel mvp-form" onSubmit={handleAllocateShares}>
                        <span className="mini-label">تخصیص مستقیم سهام به کاربر</span>
                        <h3 style={{ margin: "4px 0 10px" }}>
                          <Coins size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} />
                          افزودن سهام پروژه به پرتفوی کاربر
                        </h3>
                        <label>
                          انتخاب کاربر
                          <select
                            value={allocForm.userId}
                            onChange={(e) => setAllocForm({ ...allocForm, userId: e.target.value })}
                          >
                            {ops.users.map((u) => (
                              <option key={u.userId} value={u.userId}>
                                {u.displayName} ({u.email})
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="form-grid-two">
                          <label>
                            انتخاب پروژه
                            <select
                              value={allocForm.projectSlug}
                              onChange={(e) => setAllocForm({ ...allocForm, projectSlug: e.target.value })}
                            >
                              {projects.map((p) => (
                                <option key={p.definition.slug} value={p.definition.slug}>
                                  {p.definition.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            تعداد سهام
                            <input
                              required
                              type="number"
                              min={1}
                              max={100_000}
                              value={allocForm.shares}
                              onChange={(e) => setAllocForm({ ...allocForm, shares: Math.max(1, Number(e.target.value) || 1) })}
                            />
                          </label>
                        </div>
                        <button className="button button-red" disabled={busy}>
                          <PlusCircle size={15} /> ثبت و صدور سهام برای کاربر
                        </button>
                      </form>

                      <div className="dashboard-panel" style={{ padding: 18 }}>
                        <span className="mini-label">توزیع سود اجارهٔ ماهانه</span>
                        <h3 style={{ margin: "4px 0 8px", fontSize: 16 }}>
                          <KeyRound size={17} style={{ verticalAlign: "middle", marginLeft: 6, color: "var(--brick)" }} />
                          واریز سود به کیف پول اجارهٔ تمام سهام‌داران
                        </h3>
                        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
                          با یک کلیک، سود دورهٔ جاری پروژه‌های «ساخت - اجاره» متناسب با تعداد سهام هر کاربر به کیف پول اجارهٔ او واریز می‌شود.
                        </p>
                        <button
                          type="button"
                          className="button button-ghost button-wide"
                          disabled={busy}
                          onClick={() => void handleDistributeRental("all")}
                        >
                          <KeyRound size={15} /> توزیع سود اجاره به کیف پول اجارهٔ همهٔ کاربران
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Multi-User Directory & Live Controls */}
                  <section className="dashboard-panel">
                    <div className="panel-title-row" style={{ marginBottom: 14, flexWrap: "wrap" }}>
                      <div>
                        <span className="mini-label">مدیریت چندکاربرهٔ سرمایه‌گذاران و مدیران</span>
                        <h2 style={{ margin: "4px 0 0" }}>فهرست کاربران، کیف پول‌ها، سطوح کاربری و دارایی سهام</h2>
                      </div>
                      <button type="button" className="text-button" onClick={() => void load()}>
                        <RefreshCw size={13} /> بروزرسانی لیست
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: 12 }}>
                      {ops.users.map((u) => (
                        <article
                          key={u.userId}
                          style={{
                            padding: 16,
                            borderRadius: 16,
                            border: "1px solid var(--hairline)",
                            background: "var(--ice-white)",
                            display: "grid",
                            gap: 12,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <strong style={{ fontSize: 16, color: "var(--navy)" }}>{u.displayName}</strong>
                                <span
                                  style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    padding: "2px 9px",
                                    borderRadius: 999,
                                    background: u.tierColor,
                                    color: "#FFFFFF",
                                  }}
                                >
                                  <Award size={11} style={{ verticalAlign: "middle", marginLeft: 3 }} />
                                  سطح {u.tierName}
                                </span>
                                <span className="symbol-chip">{roles[u.role] ?? u.role}</span>
                              </div>
                              <small style={{ color: "var(--muted)", display: "block", marginTop: 4 }} dir="ltr">
                                {u.email} {u.mobile ? `· ${u.mobile}` : ""}
                              </small>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <button
                                type="button"
                                className="button button-ghost button-small"
                                disabled={busy}
                                onClick={() =>
                                  void handleUpdateUser(u.userId, {
                                    walletBalanceToman: u.walletBalanceToman + 100_000_000,
                                  })
                                }
                              >
                                <PlusCircle size={13} /> شارژ +۱۰۰ میلیون
                              </button>
                              <button
                                type="button"
                                className="button button-red button-small"
                                disabled={busy}
                                onClick={() => void handleSwitchUser(u.userId)}
                                title="ورود سریع به حساب این کاربر جهت تست چندکاربره"
                              >
                                <LogIn size={13} /> ورود به حساب این کاربر
                              </button>
                            </div>
                          </div>

                          {/* Controls for Role, Tier & Wallet */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: 10,
                              paddingTop: 10,
                              borderTop: "1px dashed var(--hairline)",
                              fontSize: 12,
                            }}
                          >
                            <div>
                              <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>موجودی نقد کیف پول:</span>
                              <strong style={{ fontSize: 14, color: "var(--navy)" }}>
                                {formatToman(u.walletBalanceToman)} تومان
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: "var(--muted)", display: "block", fontSize: 11 }}>ارزش سهام در پرتفوی:</span>
                              <strong style={{ fontSize: 14, color: "var(--profit-green)" }}>
                                {formatToman(u.portfolioValueToman)} تومان ({formatToman(u.totalSharesOwned)} سهم)
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: "var(--muted)", display: "block", fontSize: 11, marginBottom: 3 }}>
                                تغییر نقش دسترسی:
                              </span>
                              <select
                                value={u.role}
                                onChange={(e) => void handleUpdateUser(u.userId, { role: e.target.value })}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: 8,
                                  border: "1px solid var(--hairline)",
                                  fontSize: 11.5,
                                }}
                              >
                                {Object.entries(roles).map(([v, l]) => (
                                  <option key={v} value={v}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <span style={{ color: "var(--muted)", display: "block", fontSize: 11, marginBottom: 3 }}>
                                تغییر سطح کاربری (Tier):
                              </span>
                              <select
                                value={u.tierId}
                                onChange={(e) => void handleUpdateUser(u.userId, { tierId: e.target.value })}
                                style={{
                                  width: "100%",
                                  padding: "5px 8px",
                                  borderRadius: 8,
                                  border: "1px solid var(--hairline)",
                                  fontSize: 11.5,
                                }}
                              >
                                {tiers.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    سطح {t.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Holdings pills */}
                          {u.holdings.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {u.holdings.map((h) => (
                                <span
                                  key={h.projectSlug}
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: "3px 9px",
                                    borderRadius: 999,
                                    background: "rgba(30, 107, 82, 0.1)",
                                    color: "var(--profit-green)",
                                  }}
                                >
                                  {h.projectName}: {formatToman(h.shares + h.lockedShares)} سهم
                                </span>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* TAB 2: PROJECTS MANAGEMENT */}
              {tab === "projects" && (
                <div className="admin-project-layout">
                  <div>
                    <div className="panel-heading">
                      <h2>پروژه‌های سامانه</h2>
                      <button
                        type="button"
                        className="button button-ghost button-small"
                        onClick={() => setEdit(structuredClone(fresh))}
                      >
                        + پروژهٔ جدید
                      </button>
                    </div>
                    {projects.map((p) => (
                      <button
                        type="button"
                        className="project-admin-row"
                        key={p.definition.slug}
                        onClick={() => setEdit(structuredClone(p))}
                        style={{
                          borderColor:
                            edit.definition.slug === p.definition.slug ? "var(--brick)" : undefined,
                          background:
                            edit.definition.slug === p.definition.slug ? "rgba(188,74,60,.08)" : undefined,
                        }}
                      >
                        <b>{p.definition.name}</b>
                        <small>
                          {p.archived ? "بایگانی" : "فعال"} · پیشرفت: {formatToman(p.definition.progress)}٪
                        </small>
                      </button>
                    ))}
                  </div>

                  <form className="mvp-form" onSubmit={saveProject}>
                    <h3>ویرایش پروژه: {edit.definition.name || "پروژهٔ جدید"}</h3>
                    {(
                      [
                        ["slug", "شناسهٔ انگلیسی (Slug)"],
                        ["name", "نام پروژه"],
                        ["location", "موقعیت مکانی"],
                        ["type", "نوع خروجی (فروش / اجاره)"],
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key}>
                        {label}
                        <input
                          required
                          disabled={key === "slug" && edit.revision > 0}
                          value={String(edit.definition[key])}
                          onChange={(e) => change(key, e.target.value)}
                        />
                      </label>
                    ))}
                    <label>
                      مدل سرمایه‌گذاری
                      <select
                        value={edit.definition.investmentModel}
                        onChange={(e) => change("investmentModel", e.target.value)}
                      >
                        <option value="hold">ساخت - فروش</option>
                        <option value="flip">بازسازی - فروش</option>
                        <option value="rent">ساخت - اجاره</option>
                      </select>
                    </label>
                    <label>
                      خلاصهٔ معرفی پروژه
                      <textarea
                        required
                        minLength={10}
                        maxLength={6000}
                        value={edit.definition.description}
                        onChange={(e) => change("description", e.target.value)}
                      />
                    </label>
                    <label>
                      استراتژی خروج و تسویه
                      <textarea
                        required
                        minLength={2}
                        maxLength={3000}
                        value={edit.definition.outcome}
                        onChange={(e) => change("outcome", e.target.value)}
                      />
                    </label>
                    <div className="form-grid-two">
                      <label>
                        افق زمانی (ماه)
                        <input
                          required
                          type="number"
                          min={1}
                          max={120}
                          value={edit.definition.horizonMonths}
                          onChange={(e) => change("horizonMonths", Number(e.target.value))}
                        />
                      </label>
                      <label>
                        پیشرفت فیزیکی ساخت (درصد)
                        <input
                          required
                          type="number"
                          min={0}
                          max={100}
                          value={edit.definition.progress}
                          onChange={(e) => change("progress", Number(e.target.value))}
                        />
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
                      <button className="button button-red" disabled={busy}>
                        <Save size={16} /> ذخیرهٔ تغییرات پروژه
                      </button>
                      {edit.definition.slug && (
                        <Link href={`/projects/${edit.definition.slug}`} className="button button-ghost button-small">
                          مشاهدهٔ صفحهٔ پروژه
                        </Link>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: SECONDARY MARKET & ORDERS OVERSIGHT */}
              {tab === "market" && (
                <div style={{ display: "grid", gap: 20 }}>
                  <section className="dashboard-panel">
                    <div className="panel-title-row" style={{ marginBottom: 12 }}>
                      <div>
                        <span className="mini-label">مدیریت صف‌های خرید و فروش</span>
                        <h2 style={{ margin: "4px 0 0" }}>سفارش‌های باز فعال در بازار ثانویه ({formatToman(mkt?.openOrders.length ?? 0)})</h2>
                      </div>
                      <Link href="/market" className="button button-ghost button-small">
                        مشاهدهٔ تابلوی بازار ثانویه
                      </Link>
                    </div>

                    {!mkt?.openOrders.length ? (
                      <p style={{ fontSize: 12.5, color: "var(--muted)" }}>سفارش بازی در تابلو ثبت نشده است.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {mkt.openOrders.map((o) => (
                          <div
                            key={o.id}
                            className="project-admin-row"
                            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}
                          >
                            <div>
                              <strong>
                                {o.side === "buy" ? "سفارش خرید" : "سفارش فروش"} · پروژه: {o.projectSlug}
                              </strong>
                              <small style={{ display: "block" }}>
                                کاربر: {o.userDisplayName} · باقی‌مانده: {formatToman(o.remainingShares)} از {formatToman(o.initialShares)} سهم · قیمت واحد: {formatToman(o.priceToman)} تومان
                              </small>
                            </div>
                            <button
                              type="button"
                              className="button button-ghost button-small"
                              style={{ color: "var(--brick)" }}
                              disabled={busy}
                              onClick={() => void handleCancelOrder(o.id)}
                            >
                              <XCircle size={14} /> لغو سفارش و بازگشت وجه/سهم
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="dashboard-panel">
                    <h2 style={{ margin: "0 0 12px" }}>آخرین معاملات انجام‌شده میان کاربران</h2>
                    {!mkt?.recentTrades.length ? (
                      <p style={{ fontSize: 12.5, color: "var(--muted)" }}>هنوز معامله‌ای ثبت نشده است.</p>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        {mkt.recentTrades.map((t) => (
                          <div key={t.id} className="project-admin-row">
                            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
                              <strong>
                                {t.kind === "primary" ? "خرید عرضهٔ اولیه" : "معاملهٔ بازار ثانویه"} · {formatToman(t.shares)} سهم ({t.projectSlug})
                              </strong>
                              <span className="yield-badge">{formatToman(t.totalToman)} تومان</span>
                            </div>
                            <small style={{ display: "block", marginTop: 4 }}>
                              قیمت هر سهم: {formatToman(t.priceToman)} تومان · خریدار: {t.buyerId} · فروشنده: {t.sellerId} ·{" "}
                              {new Date(t.createdAt).toLocaleString("fa-IR")}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {/* TAB 4: PROJECT MEMBERSHIPS */}
              {tab === "members" && (
                <ProjectMembers projects={projects.map((p) => ({ slug: p.definition.slug, name: p.definition.name }))} />
              )}

              {/* TAB 5: SUPPORT TICKETS MANAGEMENT DIRECTLY IN ADMIN */}
              {tab === "support" && (
                <section className="dashboard-panel">
                  <span className="mini-label">پاسخ‌گویی مستقیم به کاربران</span>
                  <h2 style={{ margin: "4px 0 14px" }}>تیکت‌ها و درخواست‌های پشتیبانی کاربران</h2>
                  {!ops.tickets?.length ? (
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>هنوز تیکتی توسط کاربران ثبت نشده است.</p>
                  ) : (
                    <div style={{ display: "grid", gap: 14 }}>
                      {ops.tickets.map((t) => (
                        <article key={t.id} className="ticket-card" style={{ padding: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                            <strong>
                              {t.subject} ({t.category})
                            </strong>
                            <span className="symbol-chip">
                              {t.status === "open" ? "باز" : t.status === "answered" ? "پاسخ داده شده" : "بسته"} · کاربر: {t.ownerName}
                            </span>
                          </div>
                          <p style={{ margin: "8px 0" }}>{t.message}</p>
                          {t.replies.map((r) => (
                            <div key={r.id} className="ticket-reply">
                              <b>{r.authorName}</b>
                              <p>{r.message}</p>
                            </div>
                          ))}
                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <input
                              type="text"
                              placeholder="پاسخ مدیریت به این تیکت…"
                              value={ticketRepliesText[t.id] ?? ""}
                              onChange={(e) =>
                                setTicketRepliesText((prev) => ({ ...prev, [t.id]: e.target.value }))
                              }
                              style={{
                                flex: 1,
                                minHeight: 38,
                                borderRadius: 8,
                                border: "1px solid var(--hairline)",
                                padding: "6px 12px",
                                fontSize: 12,
                              }}
                            />
                            <button
                              type="button"
                              className="button button-red button-small"
                              disabled={busy}
                              onClick={() => void handleReplyTicket(t.id)}
                            >
                              <Send size={13} /> ارسال پاسخ
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* TAB 6: OPERATIONAL READINESS */}
              {tab === "readiness" && <OperationalReadiness />}

              {/* TAB 7: AUDIT LOGS */}
              {tab === "audit" && (
                <div className="audit-list">
                  {ops.logs.map((l) => (
                    <article className="audit-row" key={l.id}>
                      <div>
                        <strong>{l.action}</strong>
                        <p>{l.targetId}</p>
                      </div>
                      <small>{new Date(l.createdAt).toLocaleString("fa-IR")}</small>
                    </article>
                  ))}
                </div>
              )}

              {/* TAB 8: HEALTH & BACKUPS */}
              {tab === "health" && (
                <div className="mvp-form">
                  <h2>
                    <Activity size={18} /> سلامت سرویس و پشتیبان‌گیری دیتابیس
                  </h2>
                  <p>
                    پایگاه داده: {ops.health.database === "ok" ? "فعال و سالم" : ops.health.database} · فضای ذخیره‌سازی اسناد:{" "}
                    {ops.health.storage === "ok" ? "متصل و آماده" : ops.health.storage}
                  </p>
                  <BackupRetention />
                  <h3>
                    <DatabaseBackup size={18} /> نسخه‌های پشتیبان دیتابیس
                  </h3>
                  <button type="button" className="button button-red" disabled={busy} onClick={() => void backup()}>
                    {busy ? "در حال ساخت پشتیبان…" : "ساخت نسخهٔ پشتیبان جدید"}
                  </button>
                  {ops.backups.map((b) => (
                    <a className="project-admin-row" href={`/api/admin/backups?id=${b.id}`} key={b.id}>
                      <strong>{new Date(b.createdAt).toLocaleString("fa-IR")}</strong>
                      <small dir="ltr">
                        {b.checksum.slice(0, 18)}… · {Math.round(b.sizeBytes / 1024)} KB
                      </small>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
