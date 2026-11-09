import Link from "next/link";
import { ArrowLeft, BookOpen, Calculator, Layers3, MessageCircle, ShieldCheck, TrendingUp } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const articles = [
  {
    category: "راهنمای سرمایه‌گذاری",
    title: "تفاوت سه مدل ساخت، بازسازی (Flip) و املاک اجاره‌ای در خشت",
    note: "بررسی افق زمانی، جریان نقدینگی و ریسک هر مدل برای انتخاب سبد بهینه.",
    href: "/projects",
    color: "red",
  },
  {
    category: "اتاق داده و ارزیابی",
    title: "چگونه گزارش پیشرفت فیزیکی و پل ارزش پروژه را تحلیل کنیم؟",
    note: "آشنایی با نحوهٔ محاسبهٔ خالص ارزش دارایی، ذخایر احتیاطی و قیمت هر سهم.",
    href: "/how-it-works",
    color: "sand",
  },
  {
    category: "بازار ثانویه",
    title: "راهنمای ثبت سفارش خرید و فروش در تابلوی بازار ثانویه",
    note: "نحوهٔ قیمت‌گذاری سهام، تطبیق خودکار سفارش‌ها و تسویهٔ آنی در کیف پول.",
    href: "/market",
    color: "wine",
  },
];

export default function LearnPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">مجله و مرکز آموزش خشت</span>
            <h1>سرمایه‌گذاری آگاهانه با شناخت دقیق ابزارها</h1>
            <p>راهنماهای کاربردی برای تحلیل پرونده‌های ملکی، مدیریت سبد ثروت و معامله در بازار ثانویه.</p>
          </div>
        </section>
        <section className="section shell">
          <div className="community-stats">
            <div>
              <Layers3 size={20} />
              <strong>تحلیل چندبعدی</strong>
              <span>مقایسهٔ هم‌زمان ریسک، افق و بازده</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <strong>مستندات نسخه‌دار</strong>
              <span>دسترسی مستقیم به اتاق اسناد هر پروژه</span>
            </div>
            <div>
              <Calculator size={20} />
              <strong>شبیه‌سازی دقیق</strong>
              <span>محاسبهٔ سود در سه سناریوی بازار</span>
            </div>
          </div>
          <div className="section-heading">
            <div>
              <span className="mini-label">
                <BookOpen size={14} /> راهنماهای کاربردی
              </span>
              <h2>مفاهیم کلیدی سرمایه‌گذاری در خشت</h2>
            </div>
            <Link href="/faq" className="inline-link">
              پرسش‌های رایج <ArrowLeft size={15} />
            </Link>
          </div>
          <div className="news-grid">
            {articles.map((article) => (
              <article className={`news-card ${article.color}`} key={article.title}>
                <span>{article.category}</span>
                <h3>{article.title}</h3>
                <p>{article.note}</p>
                <Link href={article.href} className="arrow-link">
                  مطالعه و مشاهدهٔ بخش مرتبط <ArrowLeft size={14} />
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
