"use client";

import Link from "next/link";
import {
  ArrowDownUp,
  ArrowLeft,
  ChevronDown,
  LogIn,
  Menu,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { KhestLogo } from "./KhestLogo";

type MenuKey = "invest" | "build" | "community" | "guide" | null;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [sessionUser, setSessionUser] = useState<{ displayName: string; email: string } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [rentalWalletBalance, setRentalWalletBalance] = useState<number | null>(null);

  const closeMenu = () => {
    setMenuOpen(false);
    setOpenMenu(null);
  };

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);

  const syncHeaderState = useCallback(() => {
    fetch("/api/market", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const d = (await r.json()) as {
          actor?: { displayName: string; email: string };
          wallet?: { balanceToman: number; rentalBalanceToman?: number };
        };
        if (d.actor) setSessionUser(d.actor);
        if (d.wallet) {
          setWalletBalance(d.wallet.balanceToman);
          if (typeof d.wallet.rentalBalanceToman === "number") {
            setRentalWalletBalance(d.wallet.rentalBalanceToman);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    syncHeaderState();
    const onMarketUpdate = () => syncHeaderState();
    window.addEventListener("khesht:market-updated", onMarketUpdate);
    window.addEventListener("focus", onMarketUpdate);
    return () => {
      window.removeEventListener("khesht:market-updated", onMarketUpdate);
      window.removeEventListener("focus", onMarketUpdate);
    };
  }, [syncHeaderState]);

  const toggleMenu = (key: Exclude<MenuKey, null>) => {
    setOpenMenu((current) => (current === key ? null : key));
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="خشت" onClick={closeMenu}>
          <KhestLogo />
        </Link>
        <nav className="desktop-nav" aria-label="ناوبری اصلی">
          <div className={`nav-menu ${openMenu === "invest" ? "is-open" : ""}`}>
            <button
              type="button"
              className="nav-menu-trigger"
              aria-expanded={openMenu === "invest"}
              onClick={() => toggleMenu("invest")}
            >
              سرمایه‌گذاری و پروژه‌ها <ChevronDown size={14} />
            </button>
            <div className="nav-dropdown" role="menu">
              <Link href="/projects" onClick={closeMenu}>
                <strong>فهرست پروژه‌ها</strong>
                <span>بررسی، مقایسه و خرید مستقیم سهام</span>
              </Link>
              <Link href="/market" onClick={closeMenu}>
                <strong>بازار ثانویه</strong>
                <span>خرید و فروش آنی سهام میان کاربران</span>
              </Link>
              <Link href="/wealth" onClick={closeMenu}>
                <strong>محاسبات و مدیریت ثروت</strong>
                <span>شبیه‌سازی سبد و مقایسهٔ بازده پروژه‌ها</span>
              </Link>
            </div>
          </div>

          <div className={`nav-menu ${openMenu === "build" ? "is-open" : ""}`}>
            <button
              type="button"
              className="nav-menu-trigger"
              aria-expanded={openMenu === "build"}
              onClick={() => toggleMenu("build")}
            >
              پذیرش و ارزیابی <ChevronDown size={14} />
            </button>
            <div className="nav-dropdown" role="menu">
              <Link href="/how-it-works" onClick={closeMenu}>
                <strong>فرآیند ارزیابی و ساخت</strong>
                <span>از غربالگری تا اتاق داده و بازار ثانویه</span>
              </Link>
              <Link href="/guarantees" onClick={closeMenu}>
                <strong>تضامین و کنترل ریسک</strong>
                <span>ساختار حقوقی، حساب امانی و شفافیت اسناد</span>
              </Link>
            </div>
          </div>

          <div className={`nav-menu ${openMenu === "community" ? "is-open" : ""}`}>
            <button
              type="button"
              className="nav-menu-trigger"
              aria-expanded={openMenu === "community"}
              onClick={() => toggleMenu("community")}
            >
              میزکار و پروفایل <ChevronDown size={14} />
            </button>
            <div className="nav-dropdown" role="menu">
              <Link href="/dashboard" onClick={closeMenu}>
                <strong>داشبورد و کیف پول</strong>
                <span>کیف پول اصلی، کیف پول اجاره، دارایی سهام و سطح کاربری</span>
              </Link>
              <Link href="/profile/edit" onClick={closeMenu}>
                <strong>ویرایش مشخصات و امنیت</strong>
                <span>صفحهٔ مجزای ویرایش اطلاعات هویتی و گذرواژه</span>
              </Link>
              <Link href="/notifications" onClick={closeMenu}>
                <strong>مرکز اعلان‌ها و سوابق من</strong>
                <span>سوابق خرید، فروش، اجاره و رویدادهای حساب</span>
              </Link>
              <Link href="/tiers" onClick={closeMenu}>
                <strong>سطوح کاربری</strong>
                <span>برنزی، نقره‌ای، طلایی و تیتانیومی (متصل به حساب)</span>
              </Link>
              <Link href="/admin" onClick={closeMenu}>
                <strong>پنل مدیریت جامع</strong>
                <span>مدیریت چندکاربرهٔ اعضا، پروژه‌ها، بازار ثانویه و پشتیبان‌گیری</span>
              </Link>
            </div>
          </div>

          <div className={`nav-menu ${openMenu === "guide" ? "is-open" : ""}`}>
            <button
              type="button"
              className="nav-menu-trigger"
              aria-expanded={openMenu === "guide"}
              onClick={() => toggleMenu("guide")}
            >
              درباره و راهنما <ChevronDown size={14} />
            </button>
            <div className="nav-dropdown" role="menu">
              <Link href="/about" onClick={closeMenu}>
                <strong>دربارهٔ خشت</strong>
                <span>ماموریت، رویکرد و ارکان پلتفرم</span>
              </Link>
              <Link href="/what-is-khesht" onClick={closeMenu}>
                <strong>خشت چیست و چه نیست؟</strong>
                <span>شفافیت حقوقی و ساختار گواهی سهام</span>
              </Link>
              <Link href="/learn" onClick={closeMenu}>
                <strong>مجله و راهنمای آموزشی</strong>
                <span>آشنایی با سرمایه‌گذاری ملکی و بازار ثانویه</span>
              </Link>
              <Link href="/faq" onClick={closeMenu}>
                <strong>پرسش‌های رایج</strong>
                <span>پاسخ‌های روشن به سؤالات پرتکرار</span>
              </Link>
              <Link href="/support" onClick={closeMenu}>
                <strong>پشتیبانی و ثبت تیکت</strong>
                <span>ارتباط مستقیم با تیم کارشناسی</span>
              </Link>
            </div>
          </div>
        </nav>

        <div className="header-actions">
          {sessionUser ? (
            <>
              <Link href="/dashboard" className="login-link" style={{ fontWeight: 800, color: "var(--royalblue)" }}>
                <UserRound size={14} /> {sessionUser.displayName}
              </Link>
              {walletBalance !== null && (
                <Link href="/dashboard" className="login-link" style={{ fontWeight: 700, color: "var(--profit-green)" }}>
                  <Wallet size={14} /> {Math.round(walletBalance / 1_000_000).toLocaleString("fa-IR")} میلیون تومان
                  {rentalWalletBalance && rentalWalletBalance > 0
                    ? ` (+${Math.round(rentalWalletBalance / 1_000_000).toLocaleString("fa-IR")} م اجاره)`
                    : ""}
                </Link>
              )}
            </>
          ) : (
            <>
              <Link href="/auth" className="login-link">
                <LogIn size={14} /> ورود / ثبت‌نام
              </Link>
            </>
          )}
          <Link href="/dashboard" className="button button-red button-small">
            داشبورد من <ArrowLeft size={15} />
          </Link>
          <button
            className="mobile-menu"
            aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="ناوبری موبایل">
          <Link href="/projects" onClick={closeMenu}>
            فهرست پروژه‌ها
          </Link>
          <Link href="/market" onClick={closeMenu} style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <ArrowDownUp size={15} />
            <span>بازار ثانویه</span>
          </Link>
          <Link href="/dashboard" onClick={closeMenu}>
            داشبورد و کیف پول
          </Link>
          <Link href="/tiers" onClick={closeMenu}>
            سطوح کاربری
          </Link>
          <Link href="/notifications" onClick={closeMenu}>
            مرکز اعلان‌ها و سوابق من
          </Link>
          <Link href="/guarantees" onClick={closeMenu}>
            تضامین و کنترل ریسک
          </Link>
          <Link href="/admin" onClick={closeMenu}>
            پنل مدیریت
          </Link>
        </nav>
      )}
    </header>
  );
}
