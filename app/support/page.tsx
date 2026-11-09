import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { SupportCenter } from "../components/MemberCenters";

export default function SupportPage() { return <><Header /><main><section className="page-hero"><div className="shell"><span className="mini-label">پشتیبانی</span><h1>هر موضوع، یک مسیر قابل پیگیری.</h1><p>برای پرسش‌های مالی، حقوقی، فنی، احراز هویت یا پروژه‌ها تیکت ثبت کنید و تاریخچه پاسخ‌ها را ببینید.</p></div></section><section className="listing-section shell"><SupportCenter /></section></main><Footer /></>; }
