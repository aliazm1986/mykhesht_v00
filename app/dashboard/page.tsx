import Link from "next/link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { InvestorNav } from "../components/InvestorNav";
import { UserDashboardClient } from "../components/UserDashboardClient";
import { getWorkspaceSummary } from "@/lib/workspace-server";
import { ArrowDownUp } from "lucide-react";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const s = await getWorkspaceSummary();

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="mini-label">میزکار سرمایه‌گذار و کیف پول</span>
              <h1>داشبورد معاملاتی خشت</h1>
              <p>
                {s
                  ? `خوش آمدید، ${s.actor.displayName} (${s.actor.email}) — مدیریت موجودی، سهام پروژه‌ها و سفارش‌های بازار ثانویه.`
                  : "برای مدیریت کیف پول، مشاهدهٔ دارایی‌ها و خرید و فروش سهام وارد حساب خود شوید."}
              </p>
            </div>
            <Link href="/market" className="button button-red">
              <ArrowDownUp size={16} /> ورود به تابلوی بازار ثانویه
            </Link>
          </div>
        </section>
        <section className="member-page shell" style={{ paddingTop: 28, paddingBottom: 80 }}>
          <InvestorNav active="dashboard" />
          <div className="member-content" style={{ marginTop: 18 }}>
            <UserDashboardClient initialSummary={s} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
