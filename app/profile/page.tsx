import Link from "next/link";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { InvestorNav } from "../components/InvestorNav";
import { UserDashboardClient } from "../components/UserDashboardClient";
import { getWorkspaceSummary } from "@/lib/workspace-server";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const s = await getWorkspaceSummary();

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div
            className="shell"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}
          >
            <div>
              <span className="mini-label">پروفایل کاربری و میزکار جامع سرمایه‌گذار</span>
              <h1>پروفایل کاربری و داشبورد من</h1>
              <p>
                مشاهدهٔ مشخصات حساب، سود به‌دست‌آمده، نمودار رشد سرمایه، پروژه‌های خریداری‌شده و تاریخچهٔ کامل اقدامات انجام‌شده.
              </p>
            </div>
            <Link href="/profile/edit" className="button button-ghost">
              <Settings size={16} /> ویرایش مشخصات و امنیت (صفحهٔ مجزا)
            </Link>
          </div>
        </section>
        <section className="member-page shell" style={{ paddingTop: 28, paddingBottom: 80 }}>
          <InvestorNav active="profile" />
          <div className="member-content" style={{ marginTop: 18 }}>
            <UserDashboardClient initialSummary={s} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
