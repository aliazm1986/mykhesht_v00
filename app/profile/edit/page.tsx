import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { ProfileForm } from "../../components/MemberCenters";
import { InvestorNav } from "../../components/InvestorNav";
import { AccountSecurity } from "../../components/AccountSecurity";

export const dynamic = "force-dynamic";

export default function ProfileEditPage() {
  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="shell">
            <Link href="/profile" className="inline-link">
              <ArrowRight size={15} /> بازگشت به پروفایل کاربری و داشبورد
            </Link>
            <span className="mini-label" style={{ display: "block", marginTop: 10 }}>
              تنظیمات حساب و امنیت
            </span>
            <h1>ویرایش مشخصات هویتی و گذرواژه</h1>
            <p>نام، شمارهٔ تماس و گذرواژهٔ حساب کاربری خود را در این صفحه ویرایش و ذخیره کنید.</p>
          </div>
        </section>
        <section className="member-page shell" style={{ paddingTop: 28, paddingBottom: 80 }}>
          <InvestorNav active="profile-edit" />
          <div className="member-content" style={{ display: "grid", gap: 20 }}>
            <ProfileForm />
            <AccountSecurity />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
