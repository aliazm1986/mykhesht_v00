"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownUp, ArrowLeft, Eye, FileText, ShoppingCart } from "lucide-react";

type TrackedRecord = {
  slug: string;
  name: string;
  location: string;
  tokenSymbol?: string;
  shares?: number;
  lockedShares?: number;
  avgPriceToman?: number;
  currentPriceToman?: number;
  marketValueToman?: number;
  stage: string;
  last: string;
  status: string;
  role: string;
};

const tabs = ["همهٔ پروژه‌های من", "دارایی‌های سهام من", "پرونده‌های تحت نظر"];

const fmt = (n: number) => Math.round(n).toLocaleString("fa-IR");

export function PortfolioTabs({ records }: { records: TrackedRecord[] }) {
  const [active, setActive] = useState(tabs[0]);
  const visible = useMemo(
    () =>
      records.filter((record) => {
        const totalShares = (record.shares ?? 0) + (record.lockedShares ?? 0);
        if (active === "دارایی‌های سهام من") return totalShares > 0;
        if (active === "پرونده‌های تحت نظر") return totalShares === 0;
        return true;
      }),
    [active, records],
  );

  return (
    <div>
      <div className="portfolio-tabs">
        {tabs.map((tab) => (
          <button key={tab} type="button" className={active === tab ? "active" : ""} onClick={() => setActive(tab)}>
            {tab}
          </button>
        ))}
      </div>
      <div className="portfolio-table-wrap">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>پروژه</th>
              <th>نماد</th>
              <th>سهام آزاد / در سفارش</th>
              <th>میانگین خرید</th>
              <th>قیمت روز</th>
              <th>ارزش روز دارایی</th>
              <th>وضعیت</th>
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((record) => {
              const totalShares = (record.shares ?? 0) + (record.lockedShares ?? 0);
              return (
                <tr key={record.slug}>
                  <td>
                    <strong>{record.name}</strong>
                    <small>{record.location}</small>
                  </td>
                  <td>
                    <b className="symbol-chip">{record.tokenSymbol || `KH-${record.slug.slice(0, 6).toUpperCase()}`}</b>
                  </td>
                  <td>
                    {totalShares > 0 ? (
                      <>
                        <strong>{fmt(record.shares ?? 0)} سهم آزاد</strong>
                        {(record.lockedShares ?? 0) > 0 && <small>{fmt(record.lockedShares!)} سهم در صف فروش</small>}
                      </>
                    ) : (
                      <span>بدون سهم</span>
                    )}
                  </td>
                  <td>{totalShares > 0 ? `${fmt(record.avgPriceToman ?? 0)} تومان` : "—"}</td>
                  <td>{record.currentPriceToman ? `${fmt(record.currentPriceToman)} تومان` : "—"}</td>
                  <td>
                    <strong className={totalShares > 0 ? "table-positive" : ""}>
                      {totalShares > 0 ? `${fmt(record.marketValueToman ?? 0)} تومان` : "—"}
                    </strong>
                  </td>
                  <td>{record.status}</td>
                  <td>
                    <div className="table-actions">
                      <Link
                        title="معامله در بازار ثانویه"
                        href={`/market/${record.slug}`}
                        className="button button-red button-small"
                        style={{ padding: "5px 9px", fontSize: 10 }}
                      >
                        <ArrowDownUp size={13} /> خرید / فروش
                      </Link>
                      <Link title="جزئیات پروژه" href={`/projects/${record.slug}`}>
                        <Eye size={14} />
                      </Link>
                      <Link title="اتاق داده" href={`/projects/${record.slug}/documents`}>
                        <FileText size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && (
          <div className="empty-state">
            <p>هنوز سهمی در این بخش ثبت نشده است.</p>
            <Link href="/market" className="button button-red" style={{ marginTop: 10 }}>
              <ShoppingCart size={15} /> ورود به بازار و خرید سهام
            </Link>
          </div>
        )}
      </div>
      <div style={{ marginTop: 18, display: "flex", gap: 16 }}>
        <Link href="/market" className="inline-link">
          ورود به تابلوی بازار ثانویه <ArrowLeft size={15} />
        </Link>
        <Link href="/projects" className="inline-link">
          مرور همهٔ پروژه‌ها <ArrowLeft size={15} />
        </Link>
      </div>
    </div>
  );
}
