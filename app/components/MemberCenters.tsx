"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDownUp,
  Bell,
  CheckCircle2,
  Download,
  FileText,
  History,
  Layers3,
  LifeBuoy,
  Save,
  Send,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { AutoInvestPanel } from "./AutoInvestPanel";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const d = (await r.json()) as { ok: boolean; error?: string; data: T };
  if (!r.ok || !d.ok) throw Error(d.error || "دریافت اطلاعات انجام نشد.");
  return d.data;
}

type Ticket = {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  createdAt: string;
  replies: Array<{ id: string; author: string; message: string; createdAt: string }>;
};

export function SupportCenter() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "فنی", message: "" });
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = () =>
    api<Ticket[]>("/api/support/tickets")
      .then(setTickets)
      .catch((e) => setMessage(e.message));

  useEffect(() => {
    void load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/support/tickets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ subject: "", category: "فنی", message: "" });
      setMessage("تیکت شما در سرور ثبت شد.");
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reply(id: string) {
    setBusy(true);
    try {
      await api("/api/support/tickets", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, message: replies[id] }),
      });
      setReplies((p) => ({ ...p, [id]: "" }));
      await load();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="support-layout">
      <section className="member-panel">
        <div className="panel-heading">
          <h2>ثبت تیکت پشتیبانی جدید</h2>
          <LifeBuoy size={20} />
        </div>
        <form className="mvp-form" onSubmit={submit}>
          <label>
            موضوع درخواست
            <input
              required
              minLength={2}
              maxLength={160}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </label>
          <label>
            دسته‌بندی
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["مالی و کیف پول", "بازار ثانویه", "فنی", "احراز هویت", "پروژه‌ها"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            شرح پیام
            <textarea
              required
              minLength={2}
              maxLength={6000}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
          <button className="button button-red" disabled={busy}>
            <Send size={15} /> ثبت تیکت
          </button>
        </form>
        {message && (
          <p role="status" className="form-message">
            {message}
          </p>
        )}
      </section>
      <section className="member-panel">
        <h2>گفت‌وگوها و تیکت‌های ثبت‌شده</h2>
        {!tickets.length && <p>هنوز تیکتی ثبت نشده است.</p>}
        {tickets.map((t) => (
          <article className="ticket-card" key={t.id}>
            <strong>{t.subject}</strong>
            <small>
              {" "}
              · {t.status === "open" ? "باز" : t.status === "answered" ? "پاسخ داده شده" : "بسته"} · {t.createdAt}
            </small>
            <p>{t.message}</p>
            {t.replies.map((r) => (
              <div className="ticket-reply" key={r.id}>
                <b>{r.author}</b>
                <p>{r.message}</p>
                <small>{r.createdAt}</small>
              </div>
            ))}
            <form
              className="mvp-form"
              onSubmit={(e) => {
                e.preventDefault();
                void reply(t.id);
              }}
            >
              <label>
                پاسخ جدید
                <textarea
                  required
                  minLength={2}
                  maxLength={6000}
                  value={replies[t.id] ?? ""}
                  onChange={(e) => setReplies((p) => ({ ...p, [id]: e.target.value }))}
                />
              </label>
              <button className="button button-ghost button-small" disabled={busy}>
                ثبت پاسخ
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}

type Profile = {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  role: string;
  walletBalanceToman?: number;
  holdingsCount?: number;
  totalSharesOwned?: number;
  openOrdersCount?: number;
  ticketsCount?: number;
};

export function ProfileForm() {
  const [p, setP] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const loadProfile = () =>
    api<Profile>("/api/member")
      .then(setP)
      .catch((e) => setMessage(e.message));
  useEffect(() => {
    void loadProfile();
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api<Profile>("/api/member", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      });
      await loadProfile();
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      setMessage("اطلاعات پروفایل در سرور بروزرسانی شد و با داشبورد همگام گردید.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const fmt = (v?: number) => Math.round(v ?? 0).toLocaleString("fa-IR");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {p && (
        <div className="dashboard-cards">
          <div className="dashboard-card primary">
            <span>موجودی کیف پول متصل به پروفایل</span>
            <strong>{fmt(p.walletBalanceToman ?? 500_000_000)} تومان</strong>
            <small>حساب ورود: {p.email}</small>
          </div>
          <div className="dashboard-card">
            <span>دارایی سهام در پرتفوی</span>
            <strong>{fmt(p.totalSharesOwned)} سهم</strong>
            <small>در {fmt(p.holdingsCount)} پروژهٔ فعال</small>
          </div>
          <div className="dashboard-card">
            <span>سفارش‌های باز و تیکت‌ها</span>
            <strong>{fmt(p.openOrdersCount)} سفارش باز</strong>
            <small>{fmt(p.ticketsCount)} تیکت پشتیبانی ثبت‌شده</small>
          </div>
        </div>
      )}
      <section className="member-panel">
        <div className="panel-heading">
          <h2>مشخصات هویتی و اطلاعات تماس</h2>
          <UserRound size={20} />
        </div>
        {!p && !message && <p>در حال دریافت اطلاعات پروفایل از سرور…</p>}
        {!p && message && (
          <div className="empty-state">
            <p>{message}</p>
            <Link className="button button-red" href="/auth" style={{ marginTop: 10 }}>
              ورود یا ثبت‌نام حساب کاربری
            </Link>
          </div>
        )}
        {p && (
          <form className="mvp-form" onSubmit={save}>
            <div className="form-grid-two">
              <label>
                نام / نام کاربری
                <input
                  required
                  maxLength={100}
                  value={p.firstName}
                  onChange={(e) => setP({ ...p, firstName: e.target.value })}
                />
              </label>
              <label>
                نام خانوادگی
                <input
                  maxLength={100}
                  value={p.lastName}
                  onChange={(e) => setP({ ...p, lastName: e.target.value })}
                />
              </label>
            </div>
            <label>
              شمارهٔ همراه (جهت هماهنگی و پشتیبانی)
              <input
                maxLength={20}
                dir="ltr"
                placeholder="09120000000"
                value={p.mobile}
                onChange={(e) => setP({ ...p, mobile: e.target.value })}
              />
            </label>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>
              ایمیل حساب کاربری: <strong dir="ltr">{p.email}</strong> · نقش دسترسی:{" "}
              <strong>{p.role === "admin" ? "مدیر سامانه" : "سرمایه‌گذار فعال"}</strong>
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
              <button className="button button-red" disabled={busy}>
                <Save size={15} /> ذخیرهٔ تغییرات در سرور
              </button>
              <Link className="button button-ghost" href="/dashboard">
                مشاهدهٔ داشبورد و کیف پول
              </Link>
              <Link className="button button-ghost" href="/market">
                ورود به بازار ثانویه
              </Link>
              <Link className="button button-ghost" href="/notifications">
                اعلان‌ها و سوابق من
              </Link>
            </div>
          </form>
        )}
        {p && message && (
          <p role="status" className="sim-success" style={{ marginTop: 12, padding: 10, borderRadius: 8 }}>
            <CheckCircle2 size={15} /> {message}
          </p>
        )}
      </section>
    </div>
  );
}

export function NotificationsCenter() {
  const [items, setItems] = useState<
    Array<{ id: string; title: string; body: string; createdAt: string; read: boolean; href: string }>
  >([]);
  const [message, setMessage] = useState("");

  const load = useCallback(() => {
    api<typeof items>("/api/member?section=notifications")
      .then(setItems)
      .catch((e) => setMessage(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <section className="member-panel">
        <div className="panel-heading">
          <h2>
            <Bell size={18} style={{ verticalAlign: "middle", marginLeft: 6 }} /> پیام‌ها و اعلان‌های ثبت‌شدهٔ حساب شما
          </h2>
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={() => {
              void api("/api/member", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action: "read_all" }),
              })
                .then(load)
                .catch((e) => setMessage(e.message));
            }}
          >
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        </div>
        {!items.length && (
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            هنوز اعلان جدیدی ثبت نشده است؛ با خرید سهام یا ثبت سفارش، اعلان‌ها در این بخش نمایش داده می‌شوند.
          </p>
        )}
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((n) => (
            <Link className={`notification-item ${n.read ? "read" : "unread"}`} href={n.href} key={n.id}>
              <div>
                <strong>{n.title}</strong>
                <p>{n.body}</p>
                <small>{n.createdAt}</small>
              </div>
            </Link>
          ))}
        </div>
        {message && <p role="status">{message}</p>}
      </section>

      {/* Customer's Complete Activity & Transaction History + Alert Settings */}
      <AutoInvestPanel />
    </div>
  );
}

export function DocumentsCenter() {
  const [docs, setDocs] = useState<
    Array<{ id: string; title: string; category: string; hash: string; issuedAt: string; projectId: string }>
  >([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    api<typeof docs>("/api/member?section=documents")
      .then(setDocs)
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <section className="member-panel">
      <h2>
        <FileText size={20} /> اسناد قابل دسترسی
      </h2>
      {!docs.length && <p>هنوز سند قابل دسترسی ثبت نشده است.</p>}
      {docs.map((d) => (
        <article key={d.id} className="ticket-card">
          <strong>{d.title}</strong>
          <p>
            {d.category} · {d.issuedAt}
          </p>
          <small dir="ltr">SHA-256: {d.hash}</small>
          <div>
            <a className="button button-ghost button-small" href={`/api/data-room/documents/${d.id}`}>
              <Download size={14} /> دریافت فایل
            </a>
            <Link className="inline-link" href={`/projects/${d.projectId}/documents`}>
              پروندهٔ پروژه
            </Link>
          </div>
        </article>
      ))}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

export function ExitRequestForm() {
  return (
    <section className="member-panel">
      <h2>نقدشوندگی و فروش سهام در بازار ثانویه</h2>
      <p>
        می‌توانید سهام خریداری‌شدهٔ خود را در هر زمان در تابلوی بازار ثانویهٔ خشت به قیمت دلخواه برای فروش ثبت کنید یا به سفارش‌های خرید موجود بفروشید تا وجه آن بلافاصله به کیف پول شما واریز شود.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
        <Link className="button button-red" href="/market">
          <ArrowDownUp size={15} /> ورود به بازار ثانویه و فروش سهام
        </Link>
        <Link className="button button-ghost" href="/dashboard">
          <Layers3 size={15} /> مشاهدهٔ دارایی‌های من در داشبورد
        </Link>
        <Link className="button button-ghost" href="/support">
          ثبت تیکت پشتیبانی
        </Link>
      </div>
    </section>
  );
}
