import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { NotificationsCenter } from "../components/MemberCenters";

export default function NotificationsPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">مرکز اعلان‌ها و سوابق کاربری</span>
            <h1>اعلان‌ها و سوابق اقدامات من</h1>
            <p>
              تمامی سوابق خرید و فروش سهام، سفارش‌های بازار ثانویه، واریزی‌های کیف پول اجاره و پیام‌های حساب کاربری شما در این صفحه ثبت و نمایش داده می‌شوند.
            </p>
          </div>
        </section>
        <section className="shell" style={{ paddingTop: 28, paddingBottom: 80 }}>
          <NotificationsCenter />
        </section>
      </main>
      <Footer />
    </>
  );
}
