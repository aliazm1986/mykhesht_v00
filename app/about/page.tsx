import Link from "next/link";
import { ArrowLeft, Building2, Eye, Handshake, Scale, ShieldCheck, Layers3 } from "lucide-react";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function AboutPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">دربارهٔ خشت</span>
            <h1>شفاف‌سازی مسیر سرمایه‌گذاری ملکی و بازار ثانویه</h1>
            <p>
              خشت با هدف یکپارچه‌سازی اطلاعات فنی، مالی و حقوقی پروژه‌های ساختمانی و فراهم‌کردن امکان سرمایه‌گذاری خرد و نقدشونده شکل گرفته است.
            </p>
          </div>
        </section>
        <section className="section shell">
          <div className="about-grid">
            <article>
              <Building2 size={24} color="var(--brick)" />
              <h2>مسئلهٔ بازار سنتی ملک</h2>
              <p>
                در بازار سنتی مسکن، سرمایهٔ اولیهٔ بالا، پراکندگی اسناد، عدم شفافیت پیشرفت ساخت و دشواری نقدشوندگی مانع ورود سرمایه‌های خرد می‌شود.
              </p>
            </article>
            <article>
              <Eye size={24} color="var(--royalblue)" />
              <h2>راهکار پلتفرمی خشت</h2>
              <p>
                خشت هر پروژه را با اتاق دادهٔ نسخه‌دار، مدل مالی سه‌سناریویی، گزارش پیشرفت مهندسی و امکان خرید آنلاین سهام در یک بستر یکپارچه عرضه می‌کند.
              </p>
            </article>
            <article>
              <Scale size={24} color="var(--profit-green)" />
              <h2>حاکمیت داده و ممیزی مستقل</h2>
              <p>
                هیچ سندی بدون کنترل اصالت (SHA-256) و بازبینی کارشناس مستقل مبنای گزارش‌دهی قرار نمی‌گیرد و هر تغییر در پرونده نسخهٔ جدیدی ثبت می‌کند.
              </p>
            </article>
            <article>
              <Handshake size={24} color="var(--brick)" />
              <h2>نقدشوندگی در بازار ثانویه</h2>
              <p>
                سهام‌داران بدون نیاز به انتظار تا پایان دورهٔ ساخت، می‌توانند سهام خود را در تابلوی بازار ثانویه به سایر سرمایه‌گذاران بفروشند.
              </p>
            </article>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
            <Link href="/projects" className="button button-red">
              مشاهدهٔ پرونده‌های پروژه <ArrowLeft size={15} />
            </Link>
            <Link href="/what-is-khesht" className="button button-ghost">
              خشت چیست و چه نیست؟
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
