import { getProjectBundle } from "@/lib/projects-server";
import { properties } from "@/lib/data";

export const dynamic = "force-dynamic";

function buildPdfBytes(
  slug: string,
  unitPrice: number,
  totalSupply: number,
  estLow: number,
  estBase: number,
  estHigh: number,
  rentalYield: number,
  progress: number,
): Uint8Array {
  const valuation = unitPrice * totalSupply;
  const lines = [
    "KHESHT REAL ESTATE INVESTMENT PLATFORM - PROJECT DOSSIER",
    `Project Identifier: KH-${slug.toUpperCase()}`,
    `Current Share Price: ${unitPrice.toLocaleString("en-US")} Toman`,
    `Total Share Supply: ${totalSupply.toLocaleString("en-US")} Shares`,
    `Total Project Valuation: ${valuation.toLocaleString("en-US")} Toman`,
    `Current Physical Progress: ${progress}%`,
    "------------------------------------------------------------",
    "PRE-PURCHASE INVESTMENT SCENARIOS & PROFIT FORECAST:",
    `  1. Conservative Scenario Return: +${estLow}%`,
    `  2. Base Case Scenario Return:    +${estBase}%`,
    `  3. Optimistic Scenario Return:   +${estHigh}%`,
    `  4. Estimated Annual Rental Yield: ${rentalYield}%`,
    "------------------------------------------------------------",
    "GOVERNANCE & RISK MITIGATION SUMMARY:",
    "  - 15% Contingency Reserve locked in project escrow account",
    "  - Independent technical and legal audit before stage passage",
    "  - SHA-256 verified documents in Khesht Data Room",
    "  - 24/7 Secondary Market order book liquidity for shareholders",
  ];
  let y = 760;
  const ops = ["BT", "/F1 12 Tf"];
  lines.forEach((line, idx) => {
    const safe = line.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    ops.push(`1 0 0 1 50 ${y} Tm (${safe}) Tj`);
    y -= idx === 0 || idx === 6 || idx === 12 ? 24 : 18;
  });
  ops.push("ET");
  const streamStr = ops.join("\n");
  const objs = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}\nendstream\nendobj\n`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const o of objs) {
    offsets.push(out.length);
    out += o;
  }
  const xrefPos = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) {
    out += `${String(off).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("project") || "shahrak-west";
  const format = url.searchParams.get("format") || "pdf";
  const docTitle = url.searchParams.get("title") || "dossier";

  const bundle = await getProjectBundle(slug);
  const prop = bundle?.property ?? properties.find((p) => p.slug === slug) ?? properties[0];
  const unitPrice = prop.tokenPriceCurrent || prop.tokenPriceInitial || 500_000;
  const totalSupply = prop.totalTokenSupply || 50_000;
  const estLow = prop.estimatedReturnLow || 14;
  const estBase = prop.estimatedReturnBase || 24;
  const estHigh = prop.estimatedReturnHigh || 32;
  const rentalYield = prop.rentalYield || 8;

  if (format === "xlsx") {
    // Serve XML Spreadsheet 2003 / Excel compatible workbook with UTF-8 BOM so Excel opens Persian RTL cleanly
    const valuation = unitPrice * totalSupply;
    const xmlExcel = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header">
   <Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#191970" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Brick">
   <Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1" ss:Color="#BC4A3C"/>
  </Style>
  <Style ss:ID="Profit">
   <Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1" ss:Color="#1E6B52"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="مدل مالی و پیش‌بینی سود" ss:RightToLeft="1">
  <Table>
   <Column ss:Width="220"/>
   <Column ss:Width="180"/>
   <Column ss:Width="240"/>
   <Row>
    <Cell ss:StyleID="Header"><Data ss:Type="String">شاخص مالی / سناریوی سرمایه‌گذاری</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">مقدار / نرخ</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">توضیحات کارشناسی پرونده</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">نام پروژه</Data></Cell>
    <Cell ss:StyleID="Brick"><Data ss:Type="String">${prop.name}</Data></Cell>
    <Cell><Data ss:Type="String">${prop.location} (${prop.type})</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">شناسه و نماد معاملاتی</Data></Cell>
    <Cell><Data ss:Type="String">${prop.tokenSymbol || `KH-${prop.slug.toUpperCase()}`}</Data></Cell>
    <Cell><Data ss:Type="String">فعال در بازار اولیه و ثانویه</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">قیمت فعلی هر سهم (تومان)</Data></Cell>
    <Cell ss:StyleID="Brick"><Data ss:Type="Number">${unitPrice}</Data></Cell>
    <Cell><Data ss:Type="String">حداقل خرید: ۱ سهم</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">کل سهام منتشرشده</Data></Cell>
    <Cell><Data ss:Type="Number">${totalSupply}</Data></Cell>
    <Cell><Data ss:Type="String">ارزش کل: ${valuation.toLocaleString("fa-IR")} تومان</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">پیشرفت فیزیکی فعلی</Data></Cell>
    <Cell><Data ss:Type="String">${prop.progress}%</Data></Cell>
    <Cell><Data ss:Type="String">وضعیت: ${prop.status}</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">سناریوی ۱: محافظه‌کارانه (پیش‌بینی بازده)</Data></Cell>
    <Cell ss:StyleID="Profit"><Data ss:Type="String">+${estLow}%</Data></Cell>
    <Cell><Data ss:Type="String">با فرض افزایش ۱۵٪ هزینه ساخت و ۳ ماه تأخیر</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">سناریوی ۲: پایه کارشناسی (پیش‌بینی بازده)</Data></Cell>
    <Cell ss:StyleID="Profit"><Data ss:Type="String">+${estBase}%</Data></Cell>
    <Cell><Data ss:Type="String">بر اساس روند فعلی پروژه و میانگین معاملات منطقه</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">سناریوی ۳: خوش‌بینانه (پیش‌بینی بازده)</Data></Cell>
    <Cell ss:StyleID="Profit"><Data ss:Type="String">+${estHigh}%</Data></Cell>
    <Cell><Data ss:Type="String">در صورت تحقق کامل برنامه و رشد تقاضای منطقه</Data></Cell>
   </Row>
   <Row>
    <Cell><Data ss:Type="String">عواید اجاره‌ای سالانه برآوردی</Data></Cell>
    <Cell ss:StyleID="Profit"><Data ss:Type="String">+${rentalYield}%</Data></Cell>
    <Cell><Data ss:Type="String">علاوه بر رشد ارزش اصل دارایی</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
</Workbook>`;
    return new Response(xmlExcel, {
      status: 200,
      headers: {
        "content-type": "application/vnd.ms-excel; charset=utf-8",
        "content-disposition": `attachment; filename="khesht-${slug}-financial-model.xls"`,
        "cache-control": "no-store",
      },
    });
  }

  const pdfBytes = buildPdfBytes(slug, unitPrice, totalSupply, estLow, estBase, estHigh, rentalYield, prop.progress);
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="khesht-${slug}-${encodeURIComponent(docTitle)}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
