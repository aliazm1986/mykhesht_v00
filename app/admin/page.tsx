import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { AdminWorkspace } from "../components/AdminWorkspace";

export default function AdminPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">مرکز فرماندهی و مدیریت سامانه</span>
            <h1>پنل مدیریت جامع خشت (پشتیبانی چندکاربره)</h1>
            <p>
              مدیریت کامل کاربران، کیف پول‌ها، سطوح کاربری، پروژه‌ها، توزیع سود اجاره، سفارش‌های بازار ثانویه، تیکت‌های پشتیبانی و نسخه‌های پشتیبان.
            </p>
          </div>
        </section>
        <section className="listing-section shell">
          <AdminWorkspace />
        </section>
      </main>
      <Footer />
    </>
  );
}
