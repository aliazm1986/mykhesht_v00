'use client';

import { readJson } from '@/lib/api-client';
import { useEffect, useState, type FormEvent } from 'react';
import { LogIn, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';

export function LocalLogin() {
  const [mode, setMode] = useState('');
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => readJson<{ mode: string }>(r))
      .then((d) => setMode(d.mode))
      .catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const payload =
        tab === 'register'
          ? { action: 'register', displayName, email, password }
          : { email, password };
      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await readJson<{ error?: string }>(r);
      setPassword('');
      if (!r.ok) throw Error(d.error);
      document.cookie = 'khesht_logged_out=; Path=/; Max-Age=0';
      window.location.assign('/dashboard');
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickSwitch(targetEmail: string, targetName: string, redirectUrl = '/dashboard') {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'demo_switch',
          email: targetEmail,
          displayName: targetName,
        }),
      });
      const d = await readJson<{ error?: string }>(r);
      if (!r.ok) throw Error(d.error);
      document.cookie = 'khesht_logged_out=; Path=/; Max-Age=0';
      window.location.assign(redirectUrl);
    } catch (e) {
      setMessage((e as Error).message);
      setBusy(false);
    }
  }

  if (mode !== 'local-session') return null;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div className="auth-local-box">
        <div className="order-tabs" role="tablist">
          <button
            type="button"
            className={tab === 'login' ? 'active' : ''}
            onClick={() => {
              setTab('login');
              setMessage('');
            }}
          >
            <LogIn size={15} /> ورود به حساب
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'active' : ''}
            onClick={() => {
              setTab('register');
              setMessage('');
            }}
          >
            <UserPlus size={15} /> ثبت‌نام کاربر جدید
          </button>
        </div>

        <form className="mvp-form" onSubmit={submit}>
          <h2>{tab === 'login' ? 'ورود با ایمیل و گذرواژه' : 'ایجاد حساب کاربری و کیف پول معاملاتی'}</h2>
          {tab === 'register' && (
            <label>
              نام کاربری / نام و نام خانوادگی
              <input
                required
                minLength={2}
                maxLength={80}
                placeholder="مثلاً: علی رضایی"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
          )}
          <label>
            ایمیل
            <input
              required
              type="email"
              autoComplete="username"
              dir="ltr"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            گذرواژه {tab === 'register' ? '(حداقل ۸ نویسه)' : ''}
            <input
              required
              type="password"
              autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
              minLength={tab === 'register' ? 8 : 1}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {tab === 'register' && (
            <p className="field-help">
              با ثبت‌نام، کیف پول شما با موجودی اولیهٔ ۵۰۰ میلیون تومان برای خرید و فروش سهام پروژه‌ها و معامله در بازار ثانویه فعال می‌شود.
            </p>
          )}
          <button disabled={busy} className="button button-red">
            {busy ? 'در حال انجام…' : tab === 'login' ? 'ورود به سامانه' : 'ثبت‌نام و ورود به داشبورد'}
          </button>
          {message && (
            <p role="status" className="form-message error">
              {message}
            </p>
          )}
        </form>
      </div>

      {/* Multi-User Quick Switcher Card */}
      <div className="dashboard-panel" style={{ padding: 20 }}>
        <span className="mini-label">
          <UsersRound size={14} style={{ verticalAlign: 'middle', marginLeft: 4 }} /> جابه‌جایی سریع میان کاربران (تست چندکاربره)
        </span>
        <h3 style={{ margin: '4px 0 8px', fontSize: 17 }}>ورود تک‌کلیکی به حساب مدیر یا سرمایه‌گذاران نمونه</h3>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
          برای تست معاملات چندکاربره در بازار ثانویه یا مدیریت سامانه، می‌توانید با یک کلیک وارد هر یک از حساب‌های زیر شوید:
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <button
            type="button"
            className="button button-red button-wide"
            disabled={busy}
            onClick={() => void handleQuickSwitch('owner@khesht.test', 'مدیر کل سامانه', '/admin')}
          >
            <ShieldCheck size={15} /> ورود به حساب مدیر کل (Admin) و باز کردن پنل مدیریت
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <button
              type="button"
              className="button button-ghost button-small"
              disabled={busy}
              onClick={() => void handleQuickSwitch('sara.mohammadi@khesht.ir', 'سارا محمدی', '/dashboard')}
            >
              ورود: سارا محمدی (سرمایه‌گذار طلایی)
            </button>
            <button
              type="button"
              className="button button-ghost button-small"
              disabled={busy}
              onClick={() => void handleQuickSwitch('amir.kazemi@khesht.ir', 'امیرحسین کاظمی', '/dashboard')}
            >
              ورود: امیرحسین کاظمی (تیتانیومی)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LocalLogout() {
  return (
    <button
      className="button button-ghost"
      onClick={async () => {
        const r = await fetch('/api/auth/session', { method: 'DELETE' });
        document.cookie = 'khesht_logged_out=1; Path=/; Max-Age=86400';
        if (r.ok) window.location.assign('/auth');
      }}
    >
      خروج از حساب کاربری
    </button>
  );
}

export function LocalAccountCreate() {
  const [mode, setMode] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => readJson<{ mode: string }>(r))
      .then((d) => setMode(d.mode))
      .catch(() => {});
  }, []);
  if (mode !== 'local-session') return null;
  return (
    <form
      className="mvp-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          f = new FormData(form);
        try {
          const r = await fetch('/api/admin/local-accounts', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ email: f.get('email'), password: f.get('password') }),
            }),
            d = await readJson<{ error?: string }>(r);
          if (!r.ok) throw Error(d.error);
          form.reset();
          setMessage('حساب ساخته شد. پنل را تازه کنید و دسترسی پروژه را تعیین کنید.');
        } catch (e) {
          setMessage((e as Error).message);
        }
      }}
    >
      <h3>ساخت حساب مستقل</h3>
      <label>
        ایمیل
        <input type="email" name="email" required />
      </label>
      <label>
        گذرواژهٔ اولیه
        <input type="password" name="password" required minLength={16} maxLength={128} autoComplete="new-password" />
      </label>
      <button className="button button-ghost">ساخت حساب</button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
