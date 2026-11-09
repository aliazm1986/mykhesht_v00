import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { DocumentsCenter } from "../components/MemberCenters";
import { InvestorNav } from "../components/InvestorNav";

export default function DocumentsPage() { return <><Header /><main><section className="page-hero"><div className="shell"><span className="mini-label">مرکز اسناد</span><h1>هر سند، با تاریخ و شناسهٔ روشن.</h1><p>قرارداد، گواهی حق مالی، گزارش پروژه و رسید پرداخت را از یک نقطه ببینید.</p></div></section><section className="member-page shell"><InvestorNav active="documents" /><div className="member-content"><DocumentsCenter /></div></section></main><Footer /></>; }
