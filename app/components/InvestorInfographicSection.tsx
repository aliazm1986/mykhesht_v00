import Link from "next/link";
import { ArrowDownUp, ArrowLeft, Calculator, FileCheck2, KeyRound, ShieldCheck } from "lucide-react";

export function InvestorInfographicSection() {
  const pillars = [
    {
      num: "۰۱",
      title: "ممیزی اسناد و اصالت ثبتی در اتاق داده",
      desc: "بررسی تاریخ، نسخه و اصالت سند شش‌دانگ، پروانهٔ ساختمانی و گزارش کارشناس رسمی دادگستری در اتاق دادهٔ هر پروژه.",
      metric: "۱۰۰٪ اسناد دارای هش SHA-256",
      color: "#191970",
      bg: "rgba(25, 25, 112, 0.08)",
      icon: FileCheck2,
    },
    {
      num: "۰۲",
      title: "مقایسهٔ ۳ سناریوی سود قبل از خرید",
      desc: "شبیه‌سازی شفاف بازده سرمایه در سه سناریوی محافظه‌کارانه، پایه و خوش‌بینانه پیش از ثبت سفارش خرید سهام.",
      metric: "۳ سطح برآورد بازده کارشناسی",
      color: "#BC4A3C",
      bg: "rgba(188, 74, 60, 0.10)",
      icon: Calculator,
    },
    {
      num: "۰۳",
      title: "حساب امانی بانکی و کیف پول اجاره",
      desc: "آزادسازی مرحله‌ای بودجهٔ ساخت با تأیید مهندس ناظر و واریز مستقیم عواید پروژه‌های اجاره‌داری به کیف پول اجارهٔ شما.",
      metric: "۱۱٪ تا ۱۲٪ عواید سالانهٔ اجاره",
      color: "#1E6B52",
      bg: "rgba(30, 107, 82, 0.10)",
      icon: KeyRound,
    },
    {
      num: "۰۴",
      title: "نقدشوندگی ۲۴/۷ در بازار ثانویه و تنوع سبد",
      desc: "توزیع هوشمند سرمایه میان پروژه‌های «ساخت - فروش»، «بازسازی - فروش» و «ساخت - اجاره» با امکان فروش آنی در بازار ثانویه.",
      metric: "تسویهٔ آنی در تابلوی معاملات",
      color: "#AA4A44",
      bg: "rgba(170, 74, 68, 0.10)",
      icon: ArrowDownUp,
    },
  ];

  return (
    <section className="section section-soft" id="risk" style={{ padding: "56px 0" }}>
      <div className="shell">
        <div
          style={{
            background: "linear-gradient(145deg, #FFFFFF 0%, #FAF5EC 100%)",
            border: "1px solid rgba(188, 74, 60, 0.24)",
            borderRadius: 24,
            padding: "clamp(22px, 4vw, 38px)",
            boxShadow: "0 18px 42px rgba(25, 25, 112, 0.07)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 32, alignItems: "center" }}>
            {/* Left/Visual Column: Architectural & Financial Shield Infographic SVG */}
            <div
              style={{
                background: "linear-gradient(145deg, #191970 0%, #23235B 52%, #7A2E27 100%)",
                borderRadius: 20,
                padding: 26,
                color: "#FAF7F2",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "4px 12px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.14)",
                    color: "#FDE68A",
                  }}
                >
                  اینفوگرافیک چرخهٔ امنیت و بازده خشت
                </span>
                <ShieldCheck size={20} color="#6EE7B7" />
              </div>

              <h3 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 8px", color: "#FFFFFF" }}>
                معماری ۴ لایهٔ محافظت از سرمایهٔ شما
              </h3>
              <p style={{ fontSize: 12.5, color: "rgba(250,247,242,0.85)", lineHeight: 1.75, marginBottom: 18 }}>
                در خشت، هر ریال از سرمایهٔ شما از لحظهٔ ورود تا تسویهٔ سود در چهار حلقهٔ کنترلی پایش و پشتیبانی می‌شود:
              </p>

              {/* Custom Cohesive SVG Infographic Diagram */}
              <div
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 18,
                }}
              >
                <svg
                  viewBox="0 0 460 220"
                  width="100%"
                  height="auto"
                  role="img"
                  aria-label="اینفوگرافیک چهار اصل کلیدی سرمایه‌گذاری در خشت"
                >
                  {/* Connecting Track Lines */}
                  <line x1="65" y1="70" x2="395" y2="70" stroke="rgba(250,247,242,0.28)" strokeWidth="3" strokeDasharray="6 4" />
                  <line x1="65" y1="165" x2="395" y2="165" stroke="rgba(110,231,183,0.35)" strokeWidth="3" />

                  {/* Node 1: Data Room */}
                  <g transform="translate(20, 28)">
                    <rect x="0" y="0" width="92" height="82" rx="14" fill="#FAF7F2" stroke="#BC4A3C" strokeWidth="2" />
                    <circle cx="46" cy="24" r="13" fill="rgba(25,25,112,0.12)" />
                    <text x="46" y="28" textAnchor="middle" fill="#191970" fontSize="11" fontWeight="900">۰۱</text>
                    <text x="46" y="52" textAnchor="middle" fill="#1F1916" fontSize="11" fontWeight="800">اتاق داده</text>
                    <text x="46" y="68" textAnchor="middle" fill="#1E6B52" fontSize="9.5" fontWeight="700">اصالت سند ۱۰۰٪</text>
                  </g>

                  {/* Node 2: 3 Scenarios */}
                  <g transform="translate(132, 28)">
                    <rect x="0" y="0" width="92" height="82" rx="14" fill="#FAF7F2" stroke="#BC4A3C" strokeWidth="2" />
                    <circle cx="46" cy="24" r="13" fill="rgba(188,74,60,0.15)" />
                    <text x="46" y="28" textAnchor="middle" fill="#BC4A3C" fontSize="11" fontWeight="900">۰۲</text>
                    <text x="46" y="52" textAnchor="middle" fill="#1F1916" fontSize="11" fontWeight="800">۳ سناریوی سود</text>
                    <text x="46" y="68" textAnchor="middle" fill="#BC4A3C" fontSize="9.5" fontWeight="700">پیش‌بینی شفاف</text>
                  </g>

                  {/* Node 3: Escrow & Rental Wallet */}
                  <g transform="translate(244, 28)">
                    <rect x="0" y="0" width="92" height="82" rx="14" fill="#FAF7F2" stroke="#1E6B52" strokeWidth="2" />
                    <circle cx="46" cy="24" r="13" fill="rgba(30,107,82,0.15)" />
                    <text x="46" y="28" textAnchor="middle" fill="#1E6B52" fontSize="11" fontWeight="900">۰۳</text>
                    <text x="46" y="52" textAnchor="middle" fill="#1F1916" fontSize="11" fontWeight="800">حساب امانی</text>
                    <text x="46" y="68" textAnchor="middle" fill="#1E6B52" fontSize="9.5" fontWeight="700">+ کیف پول اجاره</text>
                  </g>

                  {/* Node 4: Secondary Market */}
                  <g transform="translate(354, 28)">
                    <rect x="0" y="0" width="92" height="82" rx="14" fill="#BC4A3C" stroke="#FAF7F2" strokeWidth="2" />
                    <circle cx="46" cy="24" r="13" fill="rgba(255,255,255,0.22)" />
                    <text x="46" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900">۰۴</text>
                    <text x="46" y="52" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="800">بازار ثانویه</text>
                    <text x="46" y="68" textAnchor="middle" fill="#FDE68A" fontSize="9.5" fontWeight="700">نقدشوندگی ۲۴/۷</text>
                  </g>

                  {/* Bottom Bar: Portfolio Mix Meter */}
                  <rect x="20" y="132" width="426" height="66" rx="12" fill="rgba(15, 23, 42, 0.55)" stroke="rgba(255,255,255,0.16)" />
                  <text x="430" y="154" textAnchor="end" fill="#FFFFFF" fontSize="11" fontWeight="800">
                    ترکیب بهینهٔ سبد پیشنهادی خشت:
                  </text>
                  {/* 3-segment visual bar */}
                  <rect x="34" y="164" width="150" height="16" rx="6" fill="#191970" />
                  <text x="109" y="176" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800">ساخت - فروش (۴۰٪)</text>

                  <rect x="190" y="164" width="130" height="16" rx="6" fill="#1E6B52" />
                  <text x="255" y="176" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800">ساخت - اجاره (۳۵٪)</text>

                  <rect x="326" y="164" width="104" height="16" rx="6" fill="#BC4A3C" />
                  <text x="378" y="176" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800">بازسازی - فروش (۲۵٪)</text>
                </svg>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 12px", borderRadius: 12, textAlign: "center" }}>
                  <strong style={{ display: "block", fontSize: 16, color: "#6EE7B7" }}>۱۰۰٪</strong>
                  <small style={{ fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>پشتوانهٔ ملکی و ثبتی</small>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 12px", borderRadius: 12, textAlign: "center" }}>
                  <strong style={{ display: "block", fontSize: 16, color: "#FDE68A" }}>۲۳٪ تا ۳۱٪</strong>
                  <small style={{ fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>میانگین بازده پایه سالانه</small>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", padding: "10px 12px", borderRadius: 12, textAlign: "center" }}>
                  <strong style={{ display: "block", fontSize: 16, color: "#FFFFFF" }}>۲۴/۷</strong>
                  <small style={{ fontSize: 10.5, color: "rgba(255,255,255,0.8)" }}>معامله در بازار ثانویه</small>
                </div>
              </div>
            </div>

            {/* Right Column: 4 Visual Pillar Cards */}
            <div>
              <span className="mini-label">چک‌لیست سرمایه‌گذار هوشمند</span>
              <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", margin: "6px 0 18px", color: "var(--navy)" }}>
                چهار اصل کلیدی پیش از خرید سهام
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {pillars.map((item) => {
                  const Icon = item.icon;
                  return (
                    <article
                      key={item.num}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "48px 1fr",
                        gap: 14,
                        alignItems: "start",
                        padding: "14px 16px",
                        borderRadius: 16,
                        background: "#FFFFFF",
                        border: "1px solid var(--hairline)",
                        boxShadow: "0 6px 18px rgba(20, 38, 61, 0.04)",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: item.bg,
                          color: item.color,
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <strong style={{ fontSize: 14.5, color: "var(--navy)" }}>
                            {item.num} · {item.title}
                          </strong>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: "3px 9px",
                              borderRadius: 999,
                              background: item.bg,
                              color: item.color,
                            }}
                          >
                            {item.metric}
                          </span>
                        </div>
                        <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "6px 0 0", lineHeight: 1.7 }}>
                          {item.desc}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                <Link href="/projects" className="button button-red">
                  مشاهده و مقایسهٔ پروژه‌ها <ArrowLeft size={16} />
                </Link>
                <Link href="/wealth" className="button button-ghost">
                  چیدمان سبد در مدیریت ثروت
                </Link>
                <Link href="/market" className="button button-ghost">
                  تابلوی بازار ثانویه
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
