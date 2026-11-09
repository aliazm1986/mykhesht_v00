import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { projectDefinitions } from "@/db/schema";
import { properties, projectProfiles, type Property, type ProjectProfile } from "@/lib/data";
import { projectDefinitionSchema, type ProjectDefinition } from "@/lib/pilot-domain";

export function defaultDefinition(p: Property): ProjectDefinition {
  const profile = projectProfiles[p.slug];
  return {
    slug: p.slug,
    name: p.name,
    location: p.location,
    description: p.description,
    outcome: p.exitStrategy || profile?.overview.outcome || "معامله در بازار ثانویه",
    investmentModel: p.investmentModel,
    type: p.type,
    horizonMonths: profile?.horizon.months ?? 12,
    progress: p.progress,
    riskLevel: p.riskLevel,
    latitude: profile?.geo.lat ?? null,
    longitude: profile?.geo.lng ?? null,
    image: p.image,
    risks: profile?.riskScenarios ?? [],
  };
}

export function toProject(d: ProjectDefinition): Property {
  const original = properties.find((p) => p.slug === d.slug);
  if (original) {
    return {
      ...original,
      latitude: d.latitude ?? original.latitude,
      longitude: d.longitude ?? original.longitude,
      name: original.name,
      location: original.location,
      description: original.description,
      investmentModel: original.investmentModel,
      type: original.type,
      status: original.status,
      progress: original.progress,
      plannedProgress: original.plannedProgress,
      actualProgress: original.actualProgress,
      riskLevel: original.riskLevel,
      image: original.image,
      exitStrategy: original.exitStrategy,
      lockup: original.lockup,
    };
  }

  const base = {
    ...properties[0],
    gallery: [d.image],
    features: [],
    documents: [],
    progressUpdates: [],
    projectValuation: 0,
    targetCapital: 0,
    raisedCapital: 0,
    tokenPriceInitial: 500_000,
    tokenPriceCurrent: 525_000,
    totalTokenSupply: 50_000,
    availableTokenSupply: 35_000,
    simulatedHolders: 64,
    minimumInvestment: 500_000,
    minimumTokens: 1,
    estimatedReturnLow: 16,
    estimatedReturnBase: 25,
    estimatedReturnHigh: 32,
    rentalYield: d.investmentModel === "rent" ? 10 : 0,
    lifecycle: properties[0].lifecycle.map((s, i) => ({
      ...s,
      status: i === 0 ? ("current" as const) : ("upcoming" as const),
    })),
  };
  return {
    ...base,
    slug: d.slug,
    latitude: d.latitude,
    longitude: d.longitude,
    name: d.name,
    location: d.location,
    description: d.description,
    investmentModel: d.investmentModel,
    type: d.type,
    progress: d.progress,
    plannedProgress: d.progress,
    actualProgress: d.progress,
    riskLevel: d.riskLevel === "بالا" ? "متوسط" : d.riskLevel,
    image: d.image,
    exitStrategy: d.outcome,
    lockup: `${d.horizonMonths} ماه`,
    status: d.progress === 0 ? "در حال جذب سرمایه" : d.progress >= 100 ? "در حال بهره‌برداری اجاره‌ای" : "در حال ساخت",
  };
}

function formatCoordinateLabel(lat: number, lng: number): string {
  const latStr = Math.abs(lat).toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  const lngStr = Math.abs(lng).toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return `${latStr}° ${lat >= 0 ? "شمالی" : "جنوبی"} · ${lngStr}° ${lng >= 0 ? "شرقی" : "غربی"}`;
}

export function toProfile(d: ProjectDefinition): ProjectProfile {
  const base = projectProfiles[d.slug];
  const lat = d.latitude ?? base?.geo.lat ?? 35.7575;
  const lng = d.longitude ?? base?.geo.lng ?? 51.4100;
  const customCoords =
    d.latitude !== null &&
    d.longitude !== null &&
    (!base || d.latitude !== base.geo.lat || d.longitude !== base.geo.lng);
  return {
    overview: base?.overview ?? { what: d.description, where: d.location, outcome: d.outcome },
    geo: {
      city: base?.geo.city ?? (d.location.split("·")[0]?.trim() || "تهران"),
      area: base?.geo.area ?? (d.location.split("·")[1]?.trim() || d.location),
      coordinateLabel: customCoords
        ? formatCoordinateLabel(lat, lng)
        : (base?.geo.coordinateLabel ?? formatCoordinateLabel(lat, lng)),
      context: base?.geo.context ?? "مکان طبق اطلاعات ثبت‌شدهٔ پروژه",
      lat,
      lng,
      pin: base?.geo.pin ?? { x: 50, y: 50 },
    },
    horizon: {
      pace: d.horizonMonths <= 12 ? "زودبازده" : d.horizonMonths <= 24 ? "میان‌مدت" : "دیر‌بازده",
      months: base?.horizon.months ?? d.horizonMonths,
      duration: base?.horizon.duration ?? `${d.horizonMonths} ماه`,
      breakEven: base?.horizon.breakEven ?? "طبق برنامهٔ زمان‌بندی پروژه",
      cashflow: base?.horizon.cashflow ?? "طبق مدل مالی پروژه",
    },
    riskScenarios: base?.riskScenarios ?? d.risks,
    simulation: base?.simulation ?? {
      defaultAmount: 100_000_000,
      assumptions: ["محاسبات بر پایهٔ مدل مالی کارشناسی پروژه است"],
    },
  };
}

export async function listProjectDefinitions(includeArchived = false) {
  const rows = await getDb().select().from(projectDefinitions);
  const map = new Map(
    properties.map((p) => [p.slug, { definition: defaultDefinition(p), revision: 0, archived: false }]),
  );
  for (const row of rows) {
    const parsed = projectDefinitionSchema.safeParse(JSON.parse(row.definitionJson));
    if (parsed.success) {
      map.set(row.slug, {
        definition: parsed.data,
        revision: row.revision,
        archived: !!row.archived,
      });
    }
  }
  return [...map.values()].filter((p) => includeArchived || !p.archived);
}

export async function getProjectBundle(slug: string) {
  const row = (await getDb().select().from(projectDefinitions).where(eq(projectDefinitions.slug, slug)).limit(1))[0];
  if (row?.archived) return null;
  const original = properties.find((p) => p.slug === slug);
  if (!row && !original) return null;
  const definition = row
    ? projectDefinitionSchema.parse(JSON.parse(row.definitionJson))
    : defaultDefinition(original!);
  return { definition, property: toProject(definition), profile: toProfile(definition), revision: row?.revision ?? 0 };
}
