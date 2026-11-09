import type { Metadata } from "next";
import "./globals.css";
import "./visual-system.css";

export const metadata: Metadata = {
  title: "خشت | پلتفرم سرمایه‌گذاری ملکی و بازار ثانویه",
  description: "بررسی مستندات پروژه‌های ملکی، خرید آنلاین سهام در مدل‌های ساخت، بازسازی و اجاره، و معاملهٔ آنی در بازار ثانویه.",
  icons: {
    icon: ["/khesht-logo.png", "/khesht-logo.svg"],
  },
  openGraph: {
    title: "خشت | پلتفرم سرمایه‌گذاری ملکی و بازار ثانویه",
    description: "سرمایه‌گذاری خرد و شفاف در پروژه‌های ساختمانی، بازسازی و املاک درآمدزا با نقدشوندگی در بازار ثانویه.",
    locale: "fa_IR",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
