"use client";
import { useEffect, useState, type FormEvent } from 'react';

export function AccountSecurity({ recoveryOnly = false }: { recoveryOnly?: boolean }) {
  const [local, setLocal] = useState(false), [current, setCurrent] = useState(''), [next, setNext] = useState(''), [confirm, setConfirm] = useState(''), [token, setToken] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/auth/session').then(r => r.json() as Promise<{mode:string}>).then(d => setLocal(d.mode === 'local-session')).catch(() => setMessage('وضعیت ورود دریافت نشد.')); }, []);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (next !== confirm) { setMessage('تکرار گذرواژه یکسان نیست.'); return; }
    setBusy(true); setMessage('');
    try {
      const r = await fetch('/api/auth/password', { method: recoveryOnly ? 'PUT' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(recoveryOnly ? { token, newPassword: next } : { currentPassword: current, newPassword: next }) });
      const d = await r.json() as {error?:string;token?:string}; if (!r.ok) throw Error(d.error || "عملیات انجام نشد.");
      setCurrent(''); setNext(''); setConfirm(''); setToken(''); setMessage('گذرواژه تغییر کرد و نشست‌های قبلی بسته شدند. دوباره وارد شوید.');
    } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); }
  }
  if (!local) return null;
  return <section className="member-panel"><h2>{recoveryOnly ? 'بازیابی حساب مستقل' : 'تغییر گذرواژهٔ مستقل'}</h2>{recoveryOnly && <p>کد یک‌بارمصرف پس از احراز هویت خارج از سامانه توسط مدیر تحویل داده می‌شود؛ ۱۵ دقیقه اعتبار دارد. کد را در نشانی صفحه وارد نکنید.</p>}<form className="mvp-form" onSubmit={submit}>
    {recoveryOnly ? <label>کد بازیابی<input required type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} minLength={64} maxLength={64}/></label> : <label>گذرواژهٔ فعلی<input required type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} maxLength={128}/></label>}
    <label>گذرواژهٔ تازه<input required type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} minLength={16} maxLength={128}/></label><label>تکرار گذرواژهٔ تازه<input required type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} minLength={16} maxLength={128}/></label><button disabled={busy} className="button button-red">{busy ? 'در حال ثبت…' : 'ثبت گذرواژهٔ تازه'}</button></form>{message && <p role="status">{message}</p>}<a className="inline-link" href="/auth">ورود به حساب</a></section>;
}

export function LocalAccountSecurity({ users }: { users: Array<{ userId: string; email: string }> }) {
  const [local, setLocal] = useState(false), [userId, setUserId] = useState(''), [action, setAction] = useState('revoke_sessions'), [message, setMessage] = useState(''), [code, setCode] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/auth/session').then(r => r.json() as Promise<{mode:string}>).then(d => setLocal(d.mode === 'local-session')); }, []);
  if (!local) return null;
  return <form className="mvp-form" onSubmit={async e => { e.preventDefault(); if (!confirmed || busy) return; setBusy(true); setCode(''); try { const r = await fetch('/api/admin/local-accounts/security', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userId, action }) }), d = await r.json() as {error?:string;token?:string}; if (!r.ok) throw Error(d.error || "عملیات انجام نشد."); setMessage(d.token ? 'کد فقط این‌بار نمایش داده می‌شود؛ پس از تطبیق هویت، از مسیر امن تحویل دهید. همهٔ نشست‌های قبلی بسته شدند.' : 'عملیات ثبت شد؛ نشست‌های حساب بسته شدند.'); setCode(d.token ?? ''); setConfirmed(false); } catch (e) { setMessage((e as Error).message); } finally { setBusy(false); } }}><h3>امنیت حساب مستقل</h3><label>حساب<select required value={userId} onChange={e => { setUserId(e.target.value); setCode(''); setConfirmed(false); }}><option value="">انتخاب کنید</option>{users.map(u => <option key={u.userId} value={u.userId}>{u.email}</option>)}</select></label><label>عملیات<select value={action} onChange={e => { setAction(e.target.value); setCode(''); setConfirmed(false); }}><option value="revoke_sessions">بستن همهٔ نشست‌ها</option><option value="recovery">ساخت کد بازیابی ۱۵دقیقه‌ای</option><option value="deactivate">غیرفعال‌کردن حساب</option></select></label><label><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/> هویت و حساب مقصد را بررسی کرده‌ام؛ بستن نشست‌ها را تأیید می‌کنم.</label><button disabled={busy || !confirmed} className="button button-ghost">اجرای عملیات</button>{message && <p role="status">{message}</p>}{code && <><label>کد محرمانهٔ بازیابی<output style={{ overflowWrap: 'anywhere' }} dir="ltr">{code}</output></label><button type="button" className="text-button" onClick={() => setCode('')}>پنهان‌کردن کد</button></>}</form>;
}
