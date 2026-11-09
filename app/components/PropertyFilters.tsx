"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, LocateFixed, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { getProjectCategoryBadge, investmentModelLabels, projectProfiles, type InvestmentModel, type Property } from "@/lib/data";
import { readJson } from "@/lib/api-client";
import { PropertyCard } from "./PropertyCard";

export function PropertyFilters({ properties }: { properties: Property[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("همه");
  const [selectedSlug, setSelectedSlug] = useState<string>("tehran-overview");
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ slug: string; type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const model = new URLSearchParams(window.location.search).get("model") as InvestmentModel | null;
    if (model && model in investmentModelLabels) setFilter(model);
  }, []);

  const syncHoldings = useCallback(async () => {
    try {
      const r = await fetch("/api/market", { cache: "no-store" });
      if (!r.ok) return;
      const d = await readJson<{
        holdings?: Array<{ projectSlug: string; shares: number; lockedShares: number }>;
      }>(r);
      if (d.holdings) {
        const map: Record<string, number> = {};
        for (const h of d.holdings) {
          map[h.projectSlug] = (h.shares ?? 0) + (h.lockedShares ?? 0);
        }
        setHoldings(map);
      }
    } catch {
      // Guest user
    }
  }, []);

  useEffect(() => {
    void syncHoldings();
    const onMarketUpdate = () => void syncHoldings();
    window.addEventListener("khesht:market-updated", onMarketUpdate);
    window.addEventListener("focus", onMarketUpdate);
    return () => {
      window.removeEventListener("khesht:market-updated", onMarketUpdate);
      window.removeEventListener("focus", onMarketUpdate);
    };
  }, [syncHoldings]);

  async function handleQuickBuy(targetSlug: string, sharesCount: number) {
    setBusySlug(targetSlug);
    setFeedback(null);
    try {
      const r = await fetch("/api/market", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "primary_buy",
          projectSlug: targetSlug,
          shares: sharesCount,
        }),
      });
      if (r.status === 401) {
        window.location.assign("/auth");
        return;
      }
      const d = await readJson<{ message?: string; error?: string }>(r);
      if (!r.ok) throw new Error(d.error || "خطا در ثبت خرید سهام");
      setFeedback({
        slug: targetSlug,
        type: "ok",
        text: d.message || "خرید سهام با موفقیت ثبت شد و به داشبورد شما اضافه گردید.",
      });
      await syncHoldings();
      window.dispatchEvent(new CustomEvent("khesht:market-updated"));
    } catch (e) {
      setFeedback({ slug: targetSlug, type: "err", text: (e as Error).message });
    } finally {
      setBusySlug(null);
    }
  }

  const [sort, setSort] = useState<"featured" | "status" | "progress">("featured");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const result = properties.filter((property) => {
      const badge = getProjectCategoryBadge(property);
      const matchesQuery =
        !normalized ||
        `${property.name} ${property.location} ${property.type} ${badge}`
          .toLowerCase()
          .includes(normalized);
      const matchesFilter =
        filter === "همه" ||
        property.investmentModel === filter ||
        badge === filter ||
        property.status === filter;
      return matchesQuery && matchesFilter;
    });
    return [...result].sort((a, b) => {
      if (sort === "status") return a.status.localeCompare(b.status, "fa");
      if (sort === "progress") return b.progress - a.progress;
      return properties.indexOf(a) - properties.indexOf(b);
    });
  }, [filter, properties, query, sort]);

  const activeMapTarget = useMemo(() => {
    if (selectedSlug === "tehran-overview") {
      return {
        title: "نمای کلان تهران",
        location: "تهران · پروژه‌های خشت",
        lat: 35.7575,
        lng: 51.4100,
        zoom: 12,
        slug: null as string | null,
      };
    }
    const found = properties.find((p) => p.slug === selectedSlug) ?? filtered[0] ?? properties[0];
    if (!found) {
      return {
        title: "نمای کلان تهران",
        location: "تهران",
        lat: 35.7575,
        lng: 51.4100,
        zoom: 12,
        slug: null as string | null,
      };
    }
    const profileGeo = projectProfiles[found.slug]?.geo;
    const lat = found.latitude ?? profileGeo?.lat ?? 35.7575;
    const lng = found.longitude ?? profileGeo?.lng ?? 51.4100;
    return {
      title: found.name,
      location: found.location,
      lat,
      lng,
      zoom: 15,
      slug: found.slug,
    };
  }, [selectedSlug, properties, filtered]);

  const googleEmbedUrl = `https://maps.google.com/maps?q=${activeMapTarget.lat},${activeMapTarget.lng}&hl=fa&z=${activeMapTarget.zoom}&output=embed`;
  const googleDirectUrl = `https://www.google.com/maps?q=${activeMapTarget.lat},${activeMapTarget.lng}&hl=fa&z=${activeMapTarget.zoom}`;

  return (
    <>
      <section className="project-map-card" style={{ marginBottom: 24 }} aria-labelledby="projects-tehran-map-title">
        <div className="panel-title-row">
          <div>
            <span className="mini-label">نقشهٔ زندهٔ گوگل (Google Maps)</span>
            <h2 id="projects-tehran-map-title">پراکندگی جغرافیایی پروژه‌ها در تهران و کشور</h2>
          </div>
          <LocateFixed size={21} color="var(--royalblue)" />
        </div>
        <div className="geo-map-toolbar">
          <div className="geo-provider-switch">
            <button
              type="button"
              className={`geo-switch-btn ${selectedSlug === "tehran-overview" ? "active" : ""}`}
              onClick={() => setSelectedSlug("tehran-overview")}
            >
              <MapPin size={13} /> نمای کل تهران
            </button>
            {filtered.map((item) => (
              <button
                key={item.slug}
                type="button"
                className={`geo-switch-btn ${selectedSlug === item.slug ? "active" : ""}`}
                onClick={() => setSelectedSlug(item.slug)}
              >
                {item.name} ({item.location.split("·").pop()?.trim()})
              </button>
            ))}
          </div>
          <div className="geo-external-links">
            {activeMapTarget.slug && (
              <Link href={`/projects/${activeMapTarget.slug}`} className="inline-link">
                باز کردن پروندهٔ {activeMapTarget.title}
              </Link>
            )}
            <a href={googleDirectUrl} target="_blank" rel="noreferrer" className="inline-link">
              مشاهده در Google Maps <ExternalLink size={13} />
            </a>
          </div>
        </div>
        <div className="geo-map">
          <iframe
            key={googleEmbedUrl}
            title={`نقشهٔ گوگل — ${activeMapTarget.title}`}
            src={googleEmbedUrl}
            className="geo-map-iframe"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          <span className="geo-scale">
            {activeMapTarget.location} ({activeMapTarget.lat.toFixed(4)}, {activeMapTarget.lng.toFixed(4)})
          </span>
        </div>
      </section>

      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="جست‌وجوی شهر یا پروژه"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجوی شهر یا پروژه"
          />
        </label>
        <label className="filter-sort">
          <SlidersHorizontal size={17} />
          <span>مرتب‌سازی</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} aria-label="مرتب‌سازی پروژه‌ها">
            <option value="featured">ترتیب پیشنهادی</option>
            <option value="status">مرحلهٔ فعلی پروژه</option>
            <option value="progress">درصد پیشرفت ساخت</option>
          </select>
        </label>
      </div>
      <div className="filter-chips">
        <button type="button" className={filter === "همه" ? "active" : ""} onClick={() => setFilter("همه")}>
          همهٔ پروژه‌ها
        </button>
        {(["hold", "flip", "rent"] as const).map((model) => (
          <button key={model} type="button" className={filter === model ? "active" : ""} onClick={() => setFilter(model)}>
            {investmentModelLabels[model]}
          </button>
        ))}
        {["در حال ساخت", "در حال بهره‌برداری اجاره‌ای", "در حال جذب سرمایه"].map((item) => (
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="property-grid">
        {filtered.map((property) => (
          <PropertyCard
            key={property.slug}
            property={property}
            ownedShares={holdings[property.slug] ?? 0}
            busy={busySlug === property.slug}
            feedback={feedback?.slug === property.slug ? feedback : null}
            onQuickBuy={(slug, sh) => void handleQuickBuy(slug, sh)}
          />
        ))}
      </div>
      {filtered.length === 0 && <div className="empty-state">برای این جست‌وجو فرصتی پیدا نشد.</div>}
    </>
  );
}
