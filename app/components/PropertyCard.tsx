"use client";

import Link from "next/link";
import { Coins, MapPin, TrendingUp, Wallet } from "lucide-react";
import {
  formatToman,
  getProjectCategoryBadge,
  getReassuringRiskLabel,
  type Property,
} from "@/lib/data";
import { BlockArt } from "./BlockArt";

export function PropertyCard({
  property,
  featured = false,
  ownedShares = 0,
  busy = false,
  feedback = null,
  onQuickBuy,
}: {
  property: Property;
  featured?: boolean;
  ownedShares?: number;
  busy?: boolean;
  feedback?: { type: "ok" | "err"; text: string } | null;
  onQuickBuy?: (slug: string, shares: number) => void;
}) {
  const unitPrice = property.tokenPriceCurrent || property.tokenPriceInitial || 500_000;
  const isFundingStage = property.progress === 0 || property.status.includes("جذب سرمایه");
  const fundingPct =
    property.targetCapital > 0 ? Math.round((property.raisedCapital / property.targetCapital) * 100) : 26;

  return (
    <article className={`property-card ${featured ? "featured" : ""}`} style={{ display: "flex", flexDirection: "column" }}>
      <Link href={`/projects/${property.slug}`} className="property-visual" style={{ display: "block" }}>
        <BlockArt accent={property.accent} compact={featured} image={property.image} alt={`نمای معماری ${property.name}`} />
        <span className="status-pill">{property.status}</span>
        <span className="property-type">{getProjectCategoryBadge(property)}</span>
      </Link>
      <div className="property-content" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div className="property-title-row">
          <div>
            <h3>
              <Link href={`/projects/${property.slug}`}>{property.name}</Link>
            </h3>
            <p>
              <MapPin size={13} /> {property.location} · نماد: {property.tokenSymbol || `KH-${property.slug.slice(0, 5).toUpperCase()}`}
            </p>
          </div>
          <span className="yield-badge">
            <TrendingUp size={13} /> +{formatToman(property.estimatedReturnBase || 24)}٪ بازده پایه
          </span>
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.75 }}>
          {property.description}
        </p>

        <div className="property-metrics" style={{ marginTop: 16 }}>
          <div>
            <span>
              <Coins size={13} /> قیمت هر سهم
            </span>
            <strong>{formatToman(unitPrice)} تومان</strong>
          </div>
          <div>
            <span>
              <Wallet size={13} /> دارایی شما
            </span>
            <strong style={{ color: "var(--profit-green)" }}>{formatToman(ownedShares)} سهم</strong>
          </div>
        </div>

        <div className="progress-line">
          <span style={{ width: `${isFundingStage ? 0 : property.progress}%` }} />
        </div>

        <div className="property-meta-line" style={{ marginBottom: 14 }}>
          <span>
            {isFundingStage
              ? `پیشرفت فیزیکی ساخت: ۰٪ (جذب سرمایه: ${formatToman(fundingPct)}٪)`
              : `پیشرفت فیزیکی پروژه: ${formatToman(property.progress)}٪ تکمیل‌شده`}
          </span>
          <span style={{ color: "var(--profit-green)", fontWeight: 600 }}>
            {getReassuringRiskLabel(property)}
          </span>
        </div>

        {feedback && (
          <p
            role="status"
            className={feedback.type === "ok" ? "sim-success" : "sim-error"}
            style={{ marginBottom: 10, padding: 8, borderRadius: 8 }}
          >
            {feedback.text}
          </p>
        )}

        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          {onQuickBuy ? (
            <button
              type="button"
              className="button button-red button-small"
              style={{ flex: 1 }}
              disabled={busy}
              onClick={() => onQuickBuy(property.slug, 5)}
            >
              {busy ? "در حال ثبت…" : "خرید سریع (۵ سهم)"}
            </button>
          ) : (
            <Link href={`/projects/${property.slug}`} className="button button-red button-small" style={{ flex: 1 }}>
              بررسی و خرید سهام
            </Link>
          )}
          <Link href={`/market/${property.slug}`} className="button button-ghost button-small">
            بازار ثانویه
          </Link>
          <Link href={`/projects/${property.slug}`} className="button button-ghost button-small">
            پرونده
          </Link>
        </div>
      </div>
    </article>
  );
}
