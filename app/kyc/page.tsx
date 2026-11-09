import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { InvestorNav } from "../components/InvestorNav";
import { getCurrentActor } from "@/lib/control";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function KycPage() {
  const actor = await getCurrentActor();
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <span className="mini-label">وضعیت احراز هویت و دسترسی معاملاتی</span>
            <h1>سطح دسترسی و مجوز معاملات</h1>
            <p>مشاهدهٔ وضعیت حساب کاربری، مجوز خرید و فروش در بازار ثانویه و سطح دسترسی به اتاق داده.</p>
          </div>
        </section>
        <section className="member-page shell">
          <InvestorNav active="kyc" />
          <div className="member-content">
            <section className="member-panel">
              <div className="panel-heading">
                <h2>
                  <ShieldCheck size={20} /> وضعیت حساب سرمایه‌گذاری
                </h2>
              </div>
              {actor ? (
                <>
                  <p className="sim-success" style={{ padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <CheckCircle2 size={17} /> حساب کاربری شما ({actor.displayName} — {actor.email}) فعال است و مجوز کامل خرید و فروش سهام و معامله در بازار ثانویه را دارد.
                  </p>
                  <p>
                    نقش فعلی شما در سامانه: <strong>{actor.role === "admin" ? "مدیر سامانه" : "سرمایه‌گذار تاییدشده"}</strong>
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                    <Link className="button button-red" href="/market">
                      ورود به بازار ثانویه
                    </Link>
                    <Link className="button button-ghost" href="/profile">
                      ویرایش اطلاعات پروفایل
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p>برای فعال‌سازی کیف پول و مجوز معاملات بازار ثانویه، وارد حساب کاربری خود شوید.</p>
                  <Link className="button button-red" href="/auth">
                    ورود یا ثبت‌نام
                  </Link>
                </>
              )}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
