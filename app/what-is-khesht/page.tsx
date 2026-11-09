import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleX, FileCheck2, Landmark, ShieldAlert } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function WhatIsKheshtPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">شفافیت مفهومی و حقوقی</span>
            <h1>خشت چیست و چه نیست؟</h1>
            <p>
              آشنایی دقیق با ماهیت گواهی سهام پروژه‌ها، نحوهٔ عملکرد اتاق داده و مرز مسئولیت‌های پلتفرم پیش از سرمایه‌گذاری.
            </p>
          </div>
        </section>
        <section className="section shell">
          <div className="what-grid">
            <article className="what-card yes">
              <CheckCircle2 size={24} />
              <h2>خشت چیست؟</h2>
              <ul>
                <li>پلتفرم تجمیع مستندات فنی، حقوقی و مدل مالی پروژه‌های ملکی در اتاق دادهٔ نسخه‌دار</li>
                <li>بستر خرید آنلاین سهام پروژه‌های ساخت، بازسازی و املاک اجاره‌ای با سرمایه‌های خرد</li>
                <li>میزکار یکپارچه برای پایش ارزش روز پرتفوی، سود و زیان و گزارش‌های دوره‌ای پیشرفت</li>
                <li>بازار ثانویهٔ شفاف برای ثبت سفارش خرید و فروش آنی سهام میان کاربران</li>
              </ul>
            </article>
            <article className="what-card no">
              <CircleX size={24} />
              <h2>خشت چه نیست؟</h2>
              <ul>
                <li>انتقال مستقیم سند تک‌برگ ثبتی به نام تک‌تک دارندگان سهام خرد</li>
                <li>وعدهٔ سود مقطوع یا تضمین بازده بدون توجه به واقعیت‌های بازار مسکن</li>
                <li>انتشار گزارش‌های بدون پشتوانه یا تغییر اسناد بدون ثبت در تاریخچهٔ نسخه‌ها</li>
                <li>دریافت کارمزدهای پنهان خارج از چارچوب شفاف اعلام‌شده در هر پروژه</li>
              </ul>
            </article>
          </div>
          <div className="clarity-rows">
            <div>
              <Landmark size={22} color="var(--royalblue)" />
              <div>
                <h3>دارایی پایه و ساختار پروژه</h3>
                <p>هر پروژه دارای پلاک مشخص، مجری تعریف‌شده، بودجهٔ ساخت یا بازسازی و افق زمانی معین در پروندهٔ اختصاصی خود است.</p>
              </div>
            </div>
            <div>
              <FileCheck2 size={22} color="var(--profit-green)" />
              <div>
                <h3>حق مالی سهام‌داران</h3>
                <p>دارندگان سهام به نسبت تعداد سهام خود از رشد ارزش پروژه در زمان خروج و عواید اجاره‌ای دوره‌ای بهره‌مند می‌شوند.</p>
              </div>
            </div>
            <div>
              <ShieldAlert size={22} color="var(--brick)" />
              <div>
                <h3>مدیریت ریسک و نقدشوندگی</h3>
                <p>در صفحهٔ هر پروژه، سناریوهای ریسک (تورم مصالح، تأخیر اجرا یا نوسان بازار) به همراه راهکار کنترلی مدیر پروژه به زبان ساده درج شده است.</p>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
            <Link href="/projects" className="button button-red">
              بررسی پروژه‌های فعال <ArrowLeft size={15} />
            </Link>
            <Link href="/guarantees" className="button button-ghost">
              سازوکار کنترل ریسک
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
