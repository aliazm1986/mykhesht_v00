import Link from "next/link";
import { KhestLogo } from "./KhestLogo";
import { legalDisclaimer } from "@/lib/data";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link href="/" className="brand" aria-label="خشت">
            <KhestLogo />
          </Link>
          <p>
            پلتفرم سرمایه‌گذاری خرد ملکی، بررسی مستندات در اتاق داده، دریافت عواید در کیف پول اجاره و خرید و فروش سهام پروژه‌ها در بازار ثانویه.
          </p>
        </div>
        <div>
          <h4>سرمایه‌گذاری و معاملات</h4>
          <Link href="/projects">فهرست پروژه‌ها</Link>
          <Link href="/market">تابلوی بازار ثانویه</Link>
          <Link href="/dashboard">داشبورد و کیف پول</Link>
          <Link href="/profile">پروفایل کاربری</Link>
          <Link href="/wealth">محاسبات و مدیریت ثروت</Link>
        </div>
        <div>
          <h4>شفافیت و حساب کاربری</h4>
          <Link href="/how-it-works">فرآیند ارزیابی و ساخت</Link>
          <Link href="/guarantees">تضامین و کنترل ریسک</Link>
          <Link href="/notifications">اعلان‌ها و سوابق من</Link>
          <Link href="/tiers">سطوح کاربری</Link>
        </div>
        <div>
          <h4>پشتیبانی و راهنما</h4>
          <Link href="/about">دربارهٔ خشت</Link>
          <Link href="/what-is-khesht">خشت چیست و چه نیست؟</Link>
          <Link href="/faq">پرسش‌های رایج</Link>
          <Link href="/support">پشتیبانی و ثبت تیکت</Link>
          <Link href="/privacy">حریم خصوصی</Link>
          <Link href="/terms">قوانین و مقررات</Link>
        </div>
      </div>
      <div className="shell footer-disclaimer">{legalDisclaimer}</div>
    </footer>
  );
}
