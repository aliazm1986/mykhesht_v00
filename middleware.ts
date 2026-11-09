import { NextResponse, type NextRequest } from "next/server";
import { guardApiRequest } from "@/lib/api-security";
export async function middleware(request:NextRequest){
  try {
    const blocked=await guardApiRequest(request);
    const response=blocked??NextResponse.next();
    response.headers.set("x-content-type-options","nosniff");
    response.headers.set("referrer-policy","same-origin");
    response.headers.set("cache-control","no-store");
    return response;
  }catch(error){console.error("API request guard failed",error);return Response.json({error:"درخواست در دسترس نیست؛ دوباره تلاش کنید."},{status:503,headers:{"cache-control":"no-store"}});}
}
export const config={matcher:["/api/:path*"]};
