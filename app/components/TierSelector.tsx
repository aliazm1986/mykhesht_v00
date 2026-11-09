"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Award, Check, CheckCircle2, Coins, FolderOpen, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { formatCompactToman, formatToman, tiers, type InvestorTier } from "@/lib/data";

type MemberTierData = {
  firstName: string;
  email: string;
  tierId?: InvestorTier;
  tierName?: string;
  tierColor?: string;
  tierAccess?: string;
  feeDiscountPercent?: number;
  investedToman?: number;
  nextTierName?: string | null;
  nextTierMinToman?: number | null;
  tierProgressPercent?: number;
};

export function TierSelector() {
  const [selected, setSelected] = useState<InvestorTier>("bronze");
  const [activeTier, setActiveTier] = useState<InvestorTier>("bronze");
  const [memberData, setMemberData] = useState<MemberTierData | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMemberTier = useCallback(async () => {
    try {
      const r = await fetch("/api/member", { cache: "no-store" });
      if (!r.ok) return;
      const d = (await r.json()) as { ok: boolean; data?: MemberTierData };
      if (d.ok && d.data) {
        setMemberData(d.data);
        if (d.data.tierId) {
          setActiveTier(d.data.tierId);
          setSelected(d.data.tierId);
        }
      }
    } catch {
      // Guest fallback
    }
  }, []);

  useEffect(() => {
    void loadMemberTier();
  }, [loadMemberTier]);

  async function handleSaveTier(targetTierId: InvestorTier) {
    setBusy(true);
    setMessage("");
    setError("");
    setSelected(targetTierId);
    try {
      const r = await fetch("/api/member", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "set_tier", tierId: targetTierId }),
      });
      if (r.status === 401) {
        window.location.assign("/auth");
        return;
      }
      const d = (await r.json()) as { ok: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error || "خطا در ثبت سطح کاربری");
      const tierObj = tiers.find((t) => t.id === targetTierId);
      setActiveTier(targetTierId);
      window.localStorage.setItem("khest-tier", targetTierId);
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
      setMessage(`سطح کاربری حساب شما در سرور به «سطح ${tierObj?.name ?? targetTierId}» ارتقا یافت و در داشبورد و اتاق اسناد اعمال گردید.`);
      await loadMemberTier();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const currentTierObj = tiers.find((t) => t.id === activeTier) ?? tiers[0];

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Live User Tier Status Banner Connected to Backend */}
      <section
        className="dashboard-panel"
        style={{
          padding: 24,
          background: "linear-gradient(135deg, #191970 0%, #23235B 55%, #7A2E27 100%)",
          color: "#FAF7F2",
          borderRadius: 22,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 18,
                background: currentTierObj.color,
                color: "#FFFFFF",
                display: "grid",
                placeItems: "center",
                boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
              }}
            >
              <Award size={32} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#FDE68A", display: "block" }}>
                وضعیت فعلی سطح کاربری شما در سرور خشت
              </span>
              <h2 style={{ margin: "4px 0 6px", fontSize: 24, color: "#FFFFFF" }}>
                سطح {currentTierObj.name} ({currentTierObj.detail})
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: "rgba(250,247,242,0.88)" }}>
                {currentTierObj.access}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                padding: "10px 16px",
                borderRadius: 14,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, display: "block", color: "rgba(255,255,255,0.8)" }}>تخفیف کارمزد بازار ثانویه</span>
              <strong style={{ fontSize: 18, color: "#6EE7B7" }}>
                {formatToman(currentTierObj.feeDiscountPercent)}٪ تخفیف
              </strong>
            </div>
            <div
              style={{
                background: "rgba(255,255,255,0.12)",
                padding: "10px 16px",
                borderRadius: 14,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 11, display: "block", color: "rgba(255,255,255,0.8)" }}>ارزش سهام فعال شما</span>
              <strong style={{ fontSize: 18, color: "#FFFFFF" }}>
                {formatCompactToman(memberData?.investedToman ?? 0)} تومان
              </strong>
            </div>
          </div>
        </div>

        {/* Progress Bar Toward Next Tier */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span>
              {memberData?.nextTierName
                ? `پیشرفت سرمایه‌گذاری تا ارتقای خودکار به سطح «${memberData.nextTierName}» (حد نصاب: ${formatCompactToman(memberData.nextTierMinToman ?? 50_000_000)} تومان)`
                : "شما در بالاترین سطح کاربری خشت (تیتانیومی) قرار دارید"}
            </span>
            <strong style={{ color: "#FDE68A" }}>{formatToman(memberData?.tierProgressPercent ?? 100)}٪</strong>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
            <div
              style={{
                width: `${memberData?.tierProgressPercent ?? 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #FDE68A, #34D399)",
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </section>

      {message && (
        <p className="sim-success" role="status" style={{ padding: 12, borderRadius: 12 }}>
          <CheckCircle2 size={16} /> {message}
        </p>
      )}
      {error && (
        <p className="sim-error" role="alert" style={{ padding: 12, borderRadius: 12 }}>
          {error}
        </p>
      )}

      {/* 4 Upgraded Tier Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(265px, 1fr))", gap: 16 }}>
        {tiers.map((tier) => {
          const isCurrent = activeTier === tier.id;
          const isSelected = selected === tier.id;
          return (
            <article
              key={tier.id}
              style={{
                background: isCurrent ? "linear-gradient(145deg, #FFFFFF, #FAF5EC)" : "#FFFFFF",
                border: isCurrent
                  ? `2px solid ${tier.color}`
                  : isSelected
                    ? "2px solid var(--brick)"
                    : "1px solid var(--hairline)",
                borderRadius: 20,
                padding: 22,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: isCurrent ? "0 14px 32px rgba(25,25,112,0.09)" : "none",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 12px",
                      borderRadius: 999,
                      background: tier.color,
                      color: "#FFFFFF",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <Award size={14} /> سطح {tier.name}
                  </span>
                  {isCurrent && (
                    <span className="yield-badge" style={{ fontSize: 11 }}>
                      <Check size={12} /> سطح فعال شما
                    </span>
                  )}
                </div>

                <strong style={{ fontSize: 16, color: "var(--navy)", display: "block", marginBottom: 4 }}>
                  {tier.detail}
                </strong>
                <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
                  {tier.access}
                </p>

                <div
                  style={{
                    background: "var(--ice-white)",
                    border: "1px solid var(--hairline)",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                    fontSize: 12,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>تخفیف کارمزد معاملات:</span>
                    <strong style={{ color: "var(--profit-green)" }}>{formatToman(tier.feeDiscountPercent)}٪</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--muted)" }}>سقف تسویهٔ روزانه:</span>
                    <strong>{formatCompactToman(tier.dailyWithdrawalLimitToman)} تومان</strong>
                  </div>
                </div>

                <ul style={{ paddingRight: 18, margin: "0 0 18px", fontSize: 12, color: "var(--ink)", lineHeight: 1.85, display: "grid", gap: 6 }}>
                  {tier.benefits.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                className={`button ${isCurrent ? "button-ghost" : "button-red"} button-wide`}
                disabled={busy || isCurrent}
                onClick={() => void handleSaveTier(tier.id)}
              >
                {isCurrent ? (
                  <>
                    <CheckCircle2 size={15} /> سطح فعال فعلی حساب شما
                  </>
                ) : (
                  <>
                    <Sparkles size={15} /> فعال‌سازی سطح {tier.name} در حساب من
                  </>
                )}
              </button>
            </article>
          );
        })}
      </div>

      {/* Quick Navigation Footer */}
      <div
        className="dashboard-panel"
        style={{
          padding: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <ShieldCheck size={18} color="var(--profit-green)" />
          <span>
            سطح کاربری شما به‌صورت زنده در <strong>داشبورد معاملاتی</strong> و <strong>اتاق دادهٔ پروژه‌ها</strong> نمایش داده می‌شود.
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/dashboard" className="button button-red button-small">
            <Coins size={14} /> مشاهده در داشبورد من
          </Link>
          <Link href="/projects" className="button button-ghost button-small">
            <FolderOpen size={14} /> بررسی اتاق اسناد پروژه‌ها
          </Link>
          <Link href="/market" className="button button-ghost button-small">
            <TrendingUp size={14} /> ورود به بازار ثانویه
          </Link>
        </div>
      </div>
    </div>
  );
}
