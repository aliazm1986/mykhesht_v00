import {LocalLogin,LocalLogout} from "../components/LocalLogin";
import {localAuthEnabled} from "@/lib/local-auth";
import{Header}from"../components/Header";
import{Footer}from"../components/Footer";
import{chatGPTSignInPath,getChatGPTUser}from"@/app/chatgpt-auth";
import Link from"next/link";
export const dynamic="force-dynamic";
export default async function AuthPage(){const user=await getChatGPTUser();return <><Header/><main className="auth-page"><section className="shell member-panel"><span className="mini-label">حساب پایلوت خشت</span><h1>ورود امن به پرونده‌ها</h1>{user?<><p>با حساب {user.email} وارد شده‌اید.</p><Link href="/profile" className="button button-red">پروفایل من</Link></>:localAuthEnabled()?null:<a target="_top" href={chatGPTSignInPath("/dashboard")} className="button button-red">ورود با حساب ChatGPT</a>}<LocalLogin/>{localAuthEnabled()&&user&&<LocalLogout/>}<p>دسترسی به اسناد و عملیات پرونده بر اساس نقش حساب کنترل می‌شود.</p></section></main><Footer/></>;}
