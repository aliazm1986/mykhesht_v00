import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ExitRequestForm } from "../components/MemberCenters";
import { InvestorNav } from "../components/InvestorNav";

export default function ExitPage() { return <><Header /><main><section className="page-hero"><div className="shell"><span className="mini-label">درخواست خروج</span><h1>خروج، یک درخواست شفاف و قابل پیگیری.</h1><p>نقدشوندگی تابع شرایط پروژه، ضوابط پلتفرم و در صورت وجود، تقاضای بازار ثانویه یا سازوکار بازخرید است.</p></div></section><section className="member-page shell"><InvestorNav active="exit" /><div className="member-content"><ExitRequestForm /></div></section></main><Footer /></>; }
