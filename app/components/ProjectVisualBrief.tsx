"use client";

import { useState } from "react";
import { Clock3, ExternalLink, LocateFixed, MapPin, ShieldCheck, Target, Waypoints } from "lucide-react";
import type { ProjectProfile } from "@/lib/data";

const riskTone = { پایین: "low", متوسط: "medium", بالا: "medium" } as const;
const reassuringBadge = {
  پایین: "کم‌ریسک · پوشش‌یافته",
  متوسط: "کنترل‌شده با حساب امانی",
  بالا: "تحت پوشش تضامین ملکی",
} as const;

type MapViewMode = "google_local" | "google_tehran" | "osm";

export function ProjectVisualBrief({ profile }: { profile: ProjectProfile }) {
  const [mapMode, setMapMode] = useState<MapViewMode>("google_local");

  const lat = profile.geo.lat ?? 35.7575;
  const lng = profile.geo.lng ?? 51.4100;

  const googleLocalEmbedUrl = `https://maps.google.com/maps?q=${lat},${lng}&hl=fa&z=15&output=embed`;
  const googleTehranEmbedUrl = `https://maps.google.com/maps?q=35.7575,51.4100&hl=fa&z=11&output=embed`;
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${(lng - 0.012).toFixed(5)}%2C${(lat - 0.008).toFixed(5)}%2C${(lng + 0.012).toFixed(5)}%2C${(lat + 0.008).toFixed(5)}&layer=mapnik&marker=${lat}%2C${lng}`;

  const activeEmbedUrl =
    mapMode === "google_tehran"
      ? googleTehranEmbedUrl
      : mapMode === "osm"
        ? osmEmbedUrl
        : googleLocalEmbedUrl;

  const googleDirectUrl = `https://www.google.com/maps?q=${lat},${lng}&hl=fa&z=16`;
  const osmDirectUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <>
      <section className="project-brief-card" aria-labelledby="project-brief-title">
        <div className="panel-title-row">
          <div>
            <span className="mini-label">یک نگاه به پرونده</span>
            <h2 id="project-brief-title">پروژه چیست و به کجا می‌رود؟</h2>
          </div>
          <Waypoints size={21} color="var(--nitro-orange)" />
        </div>
        <div className="project-brief-grid">
          <article>
            <span className="brief-icon">
              <Target size={18} />
            </span>
            <small>چیست؟</small>
            <p>{profile.overview.what}</p>
          </article>
          <article>
            <span className="brief-icon">
              <MapPin size={18} />
            </span>
            <small>کجاست؟</small>
            <p>{profile.overview.where}</p>
          </article>
          <article>
            <span className="brief-icon">
              <Waypoints size={18} />
            </span>
            <small>قرار است چه شود؟</small>
            <p>{profile.overview.outcome}</p>
          </article>
        </div>
      </section>

      <section className="project-map-card" aria-labelledby="project-map-title">
        <div className="panel-title-row">
          <div>
            <span className="mini-label">جانمایی زنده روی نقشهٔ گوگل</span>
            <h2 id="project-map-title">موقعیت جغرافیایی در {profile.geo.city} ({profile.geo.area})</h2>
          </div>
          <LocateFixed size={21} color="var(--royalblue)" />
        </div>

        <div className="geo-map-toolbar" role="tablist" aria-label="انتخاب حالت نمایش نقشه">
          <div className="geo-provider-switch">
            <button
              type="button"
              className={`geo-switch-btn ${mapMode === "google_local" ? "active" : ""}`}
              onClick={() => setMapMode("google_local")}
            >
              <MapPin size={13} /> نقشهٔ گوگل (محدودهٔ پروژه)
            </button>
            <button
              type="button"
              className={`geo-switch-btn ${mapMode === "google_tehran" ? "active" : ""}`}
              onClick={() => setMapMode("google_tehran")}
            >
              نمای کل تهران (Google)
            </button>
            <button
              type="button"
              className={`geo-switch-btn ${mapMode === "osm" ? "active" : ""}`}
              onClick={() => setMapMode("osm")}
            >
              OpenStreetMap
            </button>
          </div>
          <div className="geo-external-links">
            <a href={googleDirectUrl} target="_blank" rel="noreferrer" className="inline-link">
              باز کردن در Google Maps <ExternalLink size={13} />
            </a>
            <a href={osmDirectUrl} target="_blank" rel="noreferrer" className="inline-link">
              OSM <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="geo-map">
          <iframe
            key={activeEmbedUrl}
            title={`نقشهٔ ${profile.geo.city} · ${profile.geo.area}`}
            src={activeEmbedUrl}
            className="geo-map-iframe"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
          <span className="geo-scale">
            {profile.geo.city} · {profile.geo.area} ({lat.toFixed(4)}, {lng.toFixed(4)})
          </span>
        </div>

        <div className="geo-map-summary">
          <div>
            <span>شهر / محدوده</span>
            <strong>
              {profile.geo.city} · {profile.geo.area}
            </strong>
          </div>
          <div>
            <span>شناسهٔ مکانی</span>
            <strong>{profile.geo.coordinateLabel}</strong>
          </div>
          <div>
            <span>بافت پیرامونی</span>
            <strong>{profile.geo.context}</strong>
          </div>
        </div>
        <p className="graphic-disclaimer">
          نقشهٔ تعاملی گوگل محدودهٔ جغرافیایی پرونده را نشان می‌دهد؛ اسناد ثبتی و پلاک دقیق در اتاق داده قابل مشاهده است.
        </p>
      </section>

      <section className="project-horizon-card" aria-labelledby="horizon-title">
        <div className="horizon-ring">
          <Clock3 size={25} />
          <span>{profile.horizon.months}</span>
          <small>ماه</small>
        </div>
        <div className="horizon-copy">
          <span className="mini-label">افق سرمایه‌گذاری و جریان نقدی</span>
          <h2 id="horizon-title">
            {profile.horizon.pace} · {profile.horizon.duration}
          </h2>
          <p>{profile.horizon.cashflow}</p>
        </div>
        <div className="horizon-points">
          <div>
            <span>نقطهٔ بازگشت و تسویه</span>
            <strong>{profile.horizon.breakEven}</strong>
          </div>
          <div>
            <span>بازهٔ برنامه‌ریزی</span>
            <strong>{profile.horizon.months} ماه</strong>
          </div>
        </div>
      </section>

      <section className="risk-scenario-board" aria-labelledby="risk-board-title">
        <div className="panel-title-row">
          <div>
            <span className="mini-label">پشتوانهٔ اجرایی، حقوقی و مالی سرمایهٔ شما</span>
            <h2 id="risk-board-title">سازوکارهای تضمین، کنترل ریسک و راهکارهای محافظت از سرمایه</h2>
          </div>
          <ShieldCheck size={21} color="var(--profit-green)" />
        </div>
        <div className="risk-scenario-grid">
          {profile.riskScenarios.map((scenario, index) => (
            <article className={`risk-scenario risk-${riskTone[scenario.level]}`} key={scenario.title}>
              <div className="risk-head">
                <span>۰{index + 1}</span>
                <b style={{ color: "var(--profit-green)" }}>{reassuringBadge[scenario.level]}</b>
              </div>
              <h3>{scenario.title}</h3>
              <div>
                <small>موضوع تحت پایش</small>
                <p>{scenario.trigger}</p>
              </div>
              <div>
                <small>تضامین و اقدامات کنترلی خشت</small>
                <ul style={{ margin: "6px 0 0", paddingRight: 16, fontSize: 11, lineHeight: 1.85, color: "var(--blackstone)" }}>
                  {scenario.response
                    .split("|")
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
