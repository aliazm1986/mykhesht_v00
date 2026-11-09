export type InvestorTier = "bronze" | "silver" | "gold" | "titanium";
export type PropertyAccent = "coral" | "brick" | "wine" | "sand";
export type InvestmentModel = "hold" | "flip" | "rent";
export const investmentModelLabels: Record<InvestmentModel, string> = {
  hold: "ساخت - فروش",
  flip: "بازسازی - فروش",
  rent: "ساخت - اجاره",
};

export function getProjectCategoryBadge(property: Pick<Property, "slug" | "investmentModel" | "type">): string {
  if (property.slug === "niavaran-flip" || property.investmentModel === "flip") return "بازسازی - فروش";
  if (property.investmentModel === "hold") return "ساخت - فروش";
  if (property.investmentModel === "rent") return "ساخت - اجاره";
  return investmentModelLabels[property.investmentModel] || "ساخت - فروش";
}

export function getReassuringRiskLabel(property: Pick<Property, "riskLevel" | "investmentModel">): string {
  if (property.riskLevel === "پایین" || property.investmentModel === "rent") {
    return "کم‌ریسک · دارای پشتوانهٔ ملکی و قرارداد معتبر";
  }
  return "ریسک مدیریت‌شده · تحت نظارت مرحله‌ای و حساب امانی";
}

export type LifecycleItem = {
  title: string;
  status: "done" | "current" | "upcoming";
  note: string;
};

export type DocumentItem = {
  title: string;
  category: string;
  date: string;
  access: "عمومی" | "سطح نقره‌ای" | "سطح طلایی" | "سطح تیتانیومی";
  status: string;
};

export type ProgressItem = {
  stage: string;
  date: string;
  progress: number;
  note: string;
  image: string;
};

export type RiskScenario = {
  title: string;
  level: "پایین" | "متوسط" | "بالا";
  trigger: string;
  response: string;
};

export type ProjectProfile = {
  overview: { what: string; where: string; outcome: string };
  geo: { city: string; area: string; coordinateLabel: string; context: string; lat: number; lng: number; pin: { x: number; y: number } };
  horizon: { pace: "زودبازده" | "میان‌مدت" | "دیر‌بازده"; duration: string; months: number; breakEven: string; cashflow: string };
  riskScenarios: RiskScenario[];
  simulation: { defaultAmount: number; assumptions: string[] };
};

export type Property = {
  slug: string;
  latitude?: number | null;
  longitude?: number | null;
  name: string;
  location: string;
  type: string;
  investmentModel: InvestmentModel;
  status: string;
  accent: PropertyAccent;
  image: string;
  gallery: string[];
  description: string;
  features: string[];
  projectValuation: number;
  targetCapital: number;
  raisedCapital: number;
  tokenName: string;
  tokenSymbol: string;
  tokenPriceInitial: number;
  tokenPriceCurrent: number;
  totalTokenSupply: number;
  availableTokenSupply: number;
  simulatedHolders: number;
  minimumInvestment: number;
  minimumTokens: number;
  estimatedReturnLow: number;
  estimatedReturnBase: number;
  estimatedReturnHigh: number;
  rentalYield: number;
  progress: number;
  plannedProgress: number;
  actualProgress: number;
  riskLevel: "پایین" | "متوسط" | "بالا";
  lockup: string;
  exitStrategy: string;
  valuationDate: string;
  nextValuationDate: string;
  lifecycle: LifecycleItem[];
  documents: DocumentItem[];
  progressUpdates: ProgressItem[];
};

const commonLifecycle: LifecycleItem[] = [
  { title: "بررسی و پذیرش پروژه", status: "done", note: "ارزیابی فنی و حقوقی" },
  { title: "اتاق داده و مستندات", status: "done", note: "انتشار مستندات و نقشه‌ها" },
  { title: "ارزیابی کارشناسی رسمی", status: "done", note: "گزارش ارزیابی نسخه‌دار" },
  { title: "جذب سرمایهٔ اولیه", status: "done", note: "تخصیص واحدها در حساب امانی" },
  { title: "در حال ساخت / بازسازی", status: "current", note: "اجرای فازهای مهندسی و نظارت مقیم" },
  { title: "عرضه در بازار ثانویه", status: "upcoming", note: "معاملهٔ آزاد سهام میان کاربران" },
  { title: "بهره‌برداری اجاره‌ای / فروش", status: "upcoming", note: "توزیع عواید دوره‌ای" },
  { title: "تکمیل دوره و تسویهٔ سود", status: "upcoming", note: "تسویهٔ نهایی اصل و سود" },
];

const baseDocuments: DocumentItem[] = [
  { title: "خلاصهٔ معرفی پروژه", category: "خلاصه پروژه", date: "۱۴۰۵/۰۵/۱۲", access: "عمومی", status: "منتشرشده" },
  { title: "گزارش ارزش‌گذاری کارشناسی", category: "ارزش‌گذاری", date: "۱۴۰۵/۰۵/۱۲", access: "سطح نقره‌ای", status: "به‌روزرسانی‌شده" },
  { title: "گزارش پیشرفت دوره‌ای", category: "گزارش پیشرفت", date: "۱۴۰۵/۰۴/۲۸", access: "عمومی", status: "منتشرشده" },
  { title: "دفترچهٔ فنی و مشخصات ساخت", category: "اسناد فنی", date: "۱۴۰۵/۰۴/۲۶", access: "سطح طلایی", status: "منتشرشده" },
  { title: "مدل مالی تفصیلی پروژه", category: "اسناد مالی", date: "۱۴۰۵/۰۴/۲۵", access: "سطح طلایی", status: "منتشرشده" },
  { title: "چارچوب قراردادی و ضمائم حقوقی", category: "اسناد حقوقی", date: "۱۴۰۵/۰۴/۲۲", access: "سطح طلایی", status: "منتشرشده" },
  { title: "سند و گواهی‌های تضمین حساب امانی", category: "اتاق داده", date: "۱۴۰۵/۰۴/۲۰", access: "سطح تیتانیومی", status: "تأییدشده" },
];

export const properties: Property[] = [
  {
    slug: "niavaran-flip",
    name: "خانهٔ نیاوران",
    location: "تهران · نیاوران",
    type: "فروش",
    investmentModel: "flip",
    status: "در حال ساخت",
    accent: "brick",
    image: "/pilot-assets/niavaran-stage-2.webp",
    gallery: [
      "/pilot-assets/niavaran-stage-1.webp",
      "/pilot-assets/niavaran-stage-2.webp",
      "/pilot-assets/niavaran-stage-3.webp",
      "/pilot-assets/flip-niavaran-after.webp",
    ],
    description: "پروژهٔ خرید یک ملک ویلایی دوطبقه در نیاوران تهران، بازسازی کامل معماری و تأسیساتی و فروش در افق کوتاه‌مدت ۸ تا ۱۲ ماهه با قابلیت معاملهٔ سهام در بازار ثانویه.",
    features: ["ملک ویلایی نیاوران", "بازسازی - فروش", "حساب امانی بانکی", "افق ۸ تا ۱۲ ماه"],
    projectValuation: 42_000_000_000,
    targetCapital: 15_000_000_000,
    raisedCapital: 11_250_000_000,
    tokenName: "سهم خشت نیاوران",
    tokenSymbol: "KH-NIAVARAN",
    tokenPriceInitial: 500_000,
    tokenPriceCurrent: 560_000,
    totalTokenSupply: 84_000,
    availableTokenSupply: 48_000,
    simulatedHolders: 142,
    minimumInvestment: 500_000,
    minimumTokens: 1,
    estimatedReturnLow: 18,
    estimatedReturnBase: 28,
    estimatedReturnHigh: 36,
    rentalYield: 0,
    progress: 45,
    plannedProgress: 45,
    actualProgress: 45,
    riskLevel: "متوسط",
    lockup: "۸ تا ۱۲ ماه",
    exitStrategy: "فروش ملک بازسازی‌شده و تسویهٔ سود با دارندگان سهام",
    valuationDate: "۱۴۰۵/۰۵/۱۰",
    nextValuationDate: "۱۴۰۵/۰۸/۱۰",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 4 ? "done" : index === 4 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "تملک و تقویت سازهٔ ویلا",
        date: "مرحلهٔ ۱",
        progress: 25,
        note: "تملک قطعی ویلای دوطبقه نیاوران، سبک‌سازی و تقویت سازه با کلاف‌بندی فلزی.",
        image: "/pilot-assets/niavaran-stage-1.webp",
      },
      {
        stage: "نمای تراورتن و تأسیسات مدرن",
        date: "مرحلهٔ ۲",
        progress: 50,
        note: "نصب سنگ تراورتن ممتاز روی نمای دوطبقه، فریم‌های مشکی پنجره و تعویض کامل تأسیسات.",
        image: "/pilot-assets/niavaran-stage-2.webp",
      },
      {
        stage: "نازک‌کاری داخلی و چوب",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "اجرای سنگ اسلب کف سالن، کابینت‌های چوبی مدرن و پنجره‌های قدی رو به حیاط مشجر.",
        image: "/pilot-assets/niavaran-stage-3.webp",
      },
      {
        stage: "تکمیل نهایی ویلا و عرضه برای فروش",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "تکمیل کامل نما، محوطه‌سازی و نورپردازی ویلای نیاوران جهت فروش و تسویهٔ سود.",
        image: "/pilot-assets/flip-niavaran-after.webp",
      },
    ],
  },
  {
    slug: "shahrak-west",
    name: "پروژهٔ سرو",
    location: "تهران · شهرک غرب",
    type: "فروش",
    investmentModel: "hold",
    status: "در حال ساخت",
    accent: "coral",
    image: "/pilot-assets/project-sarv-envelope.webp",
    gallery: [
      "/pilot-assets/project-sarv-structure.webp",
      "/pilot-assets/project-sarv-envelope.webp",
      "/pilot-assets/project-sarv-interior.webp",
      "/pilot-assets/project-sarv-complete.webp",
    ],
    description: "پروژهٔ مسکونی ۶ طبقه در حال ساخت در شهرک غرب تهران با گزارش‌های مرحله‌ای پیشرفت ساخت، اتاق دادهٔ شفاف و نقدشوندگی در بازار ثانویه.",
    features: ["۱۱۸ متر", "۲ خواب", "پارکینگ", "ساخت - فروش"],
    projectValuation: 38_500_000_000,
    targetCapital: 12_000_000_000,
    raisedCapital: 8_880_000_000,
    tokenName: "توکن خشت سرو",
    tokenSymbol: "KH-AFTAB",
    tokenPriceInitial: 500_000,
    tokenPriceCurrent: 545_000,
    totalTokenSupply: 77_000,
    availableTokenSupply: 59_240,
    simulatedHolders: 186,
    minimumInvestment: 500_000,
    minimumTokens: 1,
    estimatedReturnLow: 18,
    estimatedReturnBase: 27,
    estimatedReturnHigh: 34,
    rentalYield: 0,
    progress: 74,
    plannedProgress: 71,
    actualProgress: 74,
    riskLevel: "پایین",
    lockup: "۱۲ تا ۱۵ ماه",
    exitStrategy: "تکمیل ساخت، فروش واحدها و نقدشوندگی در بازار ثانویه",
    valuationDate: "۱۴۰۵/۰۵/۱۲",
    nextValuationDate: "۱۴۰۵/۰۸/۱۲",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 4 ? "done" : index === 4 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "سازه و اسکلت بتنی",
        date: "مرحلهٔ ۱",
        progress: 25,
        note: "تکمیل اسکلت بتنی ۶ طبقه و سقف‌ها طبق برنامهٔ زمان‌بندی مهندسی.",
        image: "/pilot-assets/project-sarv-structure.webp",
      },
      {
        stage: "پوسته، نمای آجری-سنگی و پنجره‌ها",
        date: "مرحلهٔ ۲",
        progress: 50,
        note: "اجرای دیوارچینی، نمای ترکیبی آجر و سنگ و نصب فریم پنجره‌ها.",
        image: "/pilot-assets/project-sarv-envelope.webp",
      },
      {
        stage: "فضای داخلی و نازک‌کاری واحدها",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "اجرای تأسیسات سقفی، کناف، کف‌سازی و کابینت واحدها (فاز فعلی در ۷۴٪ پیشرفت).",
        image: "/pilot-assets/project-sarv-interior.webp",
      },
      {
        stage: "تکمیل نهایی ساختمان و تحویل",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "نمای نهایی ساختمان ۶ طبقهٔ سرو پس از برچیدن داربست و تکمیل مشاعات.",
        image: "/pilot-assets/project-sarv-complete.webp",
      },
    ],
  },
  {
    slug: "narvan-renovation",
    name: "پروژهٔ نارون",
    location: "تهران · میدان ونک",
    type: "اجاره",
    investmentModel: "rent",
    status: "در حال بهره‌برداری اجاره‌ای",
    accent: "wine",
    image: "/pilot-assets/project-narvan-office.webp",
    gallery: [
      "/pilot-assets/narvan-stage-2.webp",
      "/pilot-assets/office-stage-3.webp",
      "/pilot-assets/project-narvan-office.webp",
    ],
    description: "ساختمان اداری ۴ طبقهٔ تکمیل‌شده در محور ونک تهران با ۱۴ واحد فعال، قراردادهای اجارهٔ جاری و واریز مستقیم عواید به کیف پول اجاره.",
    features: ["۹۸۰ متر زیربنا", "۱۴ واحد", "ساخت - اجاره", "قرارداد اجارهٔ فعال"],
    projectValuation: 29_800_000_000,
    targetCapital: 9_500_000_000,
    raisedCapital: 9_500_000_000,
    tokenName: "توکن خشت نارون",
    tokenSymbol: "KH-NARVAN",
    tokenPriceInitial: 500_000,
    tokenPriceCurrent: 525_000,
    totalTokenSupply: 59_600,
    availableTokenSupply: 18_400,
    simulatedHolders: 214,
    minimumInvestment: 500_000,
    minimumTokens: 1,
    estimatedReturnLow: 16,
    estimatedReturnBase: 23,
    estimatedReturnHigh: 30,
    rentalYield: 11,
    progress: 100,
    plannedProgress: 100,
    actualProgress: 100,
    riskLevel: "پایین",
    lockup: "۹ تا ۱۲ ماه",
    exitStrategy: "واریز دوره‌ای به کیف پول اجاره و معامله در بازار ثانویه",
    valuationDate: "۱۴۰۵/۰۵/۰۵",
    nextValuationDate: "۱۴۰۵/۰۸/۰۵",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 6 ? "done" : index === 6 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "سازه و زیرساخت ساختمان اداری",
        date: "مرحلهٔ ۱",
        progress: 25,
        note: "تکمیل اسکلت ۴ طبقهٔ اداری و زیرساخت تأسیسات مرکزی.",
        image: "/pilot-assets/narvan-stage-2.webp",
      },
      {
        stage: "اجرای نمای آجری و شیلدهای فلزی",
        date: "مرحلهٔ ۲",
        progress: 50,
        note: "نصب ستون‌های آجری، شیشه‌های قدی و پنل‌های مشبک برنزی نما.",
        image: "/pilot-assets/narvan-stage-2.webp",
      },
      {
        stage: "پارتیشن‌بندی شیشه‌ای و سقف آکوستیک",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "تجهیز ۱۴ واحد اداری با پارتیشن‌های شیشه‌ای دوجداره و سقف چوبی آکوستیک.",
        image: "/pilot-assets/office-stage-3.webp",
      },
      {
        stage: "تکمیل نهایی و بهره‌برداری اجاره‌ای",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "ساختمان تکمیل‌شده و فعال با استقرار کامل مستأجران شرکتی و واریز اجاره.",
        image: "/pilot-assets/project-narvan-office.webp",
      },
    ],
  },
  {
    slug: "kish-marina",
    name: "پروژهٔ هما",
    location: "کیش · محدودهٔ ساحلی مارینا",
    type: "اجاره",
    investmentModel: "rent",
    status: "در حال ساخت",
    accent: "brick",
    image: "/pilot-assets/homa-stage-2.webp",
    gallery: [
      "/pilot-assets/homa-stage-1.webp",
      "/pilot-assets/homa-stage-2.webp",
      "/pilot-assets/homa-stage-3.webp",
      "/pilot-assets/project-homa-courtyard.webp",
    ],
    description: "مجموعهٔ اقامتی و ویلایی ساحلی در مارینای کیش در مرحلهٔ اجرای پوستهٔ سنگی و مشبک آجری (۴۸٪ پیشرفت) با کاربری اجارهٔ گردشگری و بازدهی پایدار.",
    features: ["۷۲ متر", "ویوی دریا", "ساخت - اجاره", "مدیریت بهره‌برداری"],
    projectValuation: 61_200_000_000,
    targetCapital: 18_000_000_000,
    raisedCapital: 8_640_000_000,
    tokenName: "توکن خشت مارینا",
    tokenSymbol: "KH-MARINA",
    tokenPriceInitial: 750_000,
    tokenPriceCurrent: 790_000,
    totalTokenSupply: 81_600,
    availableTokenSupply: 46_080,
    simulatedHolders: 93,
    minimumInvestment: 750_000,
    minimumTokens: 1,
    estimatedReturnLow: 19,
    estimatedReturnBase: 31,
    estimatedReturnHigh: 38,
    rentalYield: 12,
    progress: 48,
    plannedProgress: 50,
    actualProgress: 48,
    riskLevel: "متوسط",
    lockup: "۱۲ تا ۱۸ ماه",
    exitStrategy: "توزیع عواید در کیف پول اجاره و بازار ثانویه",
    valuationDate: "۱۴۰۵/۰۴/۲۲",
    nextValuationDate: "۱۴۰۵/۰۷/۲۲",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 4 ? "done" : index === 4 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "اسکلت بتنی ویلا و گودبرداری استخر",
        date: "مرحلهٔ ۱",
        progress: 25,
        note: "اجرای فونداسیون ساحلی، اسکلت بتنی دوطبقهٔ L شکل و کاسهٔ استخر مرکزی.",
        image: "/pilot-assets/homa-stage-1.webp",
      },
      {
        stage: "نمای سنگ تراورتن و آجر مشبک",
        date: "مرحلهٔ ۲",
        progress: 50,
        note: "نصب سنگ تراورتن کرم و دیوارهای مشبک آجری سنتی-مدرن (فاز فعلی در ۴۸٪ پیشرفت).",
        image: "/pilot-assets/homa-stage-2.webp",
      },
      {
        stage: "کف‌سازی حیاط، پرگولای چوبی و استخر",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "نصب سقف چوبی ایوان، سنگ‌فرش دور استخر و شیشه‌های قدی رو به حیاط.",
        image: "/pilot-assets/homa-stage-3.webp",
      },
      {
        stage: "تکمیل نهایی، محوطه‌سازی و بهره‌برداری",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "آب‌گیری استخر، کاشت فضای سبز مدیترانه‌ای، چیدمان مبلمان و شروع اجارهٔ ساحلی.",
        image: "/pilot-assets/project-homa-courtyard.webp",
      },
    ],
  },
  {
    slug: "mirdamad-office",
    name: "پروندهٔ ارغوان",
    location: "تهران · بلوار میرداماد",
    type: "اجاره",
    investmentModel: "rent",
    status: "در حال بهره‌برداری اجاره‌ای",
    accent: "wine",
    image: "/pilot-assets/arghavan-complete.webp",
    gallery: [
      "/pilot-assets/narvan-stage-2.webp",
      "/pilot-assets/office-stage-3.webp",
      "/pilot-assets/arghavan-complete.webp",
    ],
    description: "ساختمان ۵ طبقهٔ اداری-تجاری تکمیل‌شده در بلوار میرداماد تهران با مستأجر شرکتی معتبر، دسترسی مستقیم به مترو و واریز منظم به کیف پول اجاره.",
    features: ["۲۶۵ متر", "مستأجر شرکتی فعال", "ساخت - اجاره", "دسترسی مترو"],
    projectValuation: 44_000_000_000,
    targetCapital: 14_500_000_000,
    raisedCapital: 14_500_000_000,
    tokenName: "توکن خشت ارغوان",
    tokenSymbol: "KH-MIRDAMAD",
    tokenPriceInitial: 1_000_000,
    tokenPriceCurrent: 1_085_000,
    totalTokenSupply: 44_000,
    availableTokenSupply: 12_500,
    simulatedHolders: 241,
    minimumInvestment: 1_000_000,
    minimumTokens: 1,
    estimatedReturnLow: 17,
    estimatedReturnBase: 24,
    estimatedReturnHigh: 29,
    rentalYield: 12,
    progress: 100,
    plannedProgress: 100,
    actualProgress: 100,
    riskLevel: "پایین",
    lockup: "۶ تا ۹ ماه",
    exitStrategy: "واریز ماهانه به کیف پول اجاره و بازار ثانویه",
    valuationDate: "۱۴۰۵/۰۵/۰۱",
    nextValuationDate: "۱۴۰۵/۰۸/۰۱",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 6 ? "done" : index === 6 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "اسکلت و سازهٔ ساختمان میرداماد",
        date: "مرحلهٔ ۱",
        progress: 25,
        note: "احداث اسکلت ۵ طبقه و پارکینگ‌های طبقاتی در برِ اصلی بلوار میرداماد.",
        image: "/pilot-assets/narvan-stage-2.webp",
      },
      {
        stage: "نمای آجری، تراورتن و کرتین‌وال",
        date: "مرحلهٔ ۲",
        progress: 50,
        note: "اجرای ستون‌های آجری گرم، سنگ تراورتن و شیشه‌های دوجدارهٔ برنزی.",
        image: "/pilot-assets/narvan-stage-2.webp",
      },
      {
        stage: "تجهیز پارتیشن‌ها و لابی اداری",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "اجرای پارتیشن‌بندی شیشه‌ای طبقات اداری، سقف آکوستیک و سیستم هوشمند.",
        image: "/pilot-assets/office-stage-3.webp",
      },
      {
        stage: "بهره‌برداری کامل و استقرار مستأجر شرکتی",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "ساختمان ۵ طبقهٔ تکمیل‌شده و فعال در بلوار میرداماد با واریز ماهانهٔ اجاره.",
        image: "/pilot-assets/arghavan-complete.webp",
      },
    ],
  },
  {
    slug: "lavasan-garden",
    name: "پروژهٔ سپهر",
    location: "لواسان · محلهٔ ناران",
    type: "فروش",
    investmentModel: "hold",
    status: "در حال ساخت",
    accent: "sand",
    image: "/pilot-assets/sepehr-stage-2.webp",
    gallery: [
      "/pilot-assets/sepehr-stage-1.webp",
      "/pilot-assets/sepehr-stage-2.webp",
      "/pilot-assets/project-sarv-interior.webp",
      "/pilot-assets/project-sepehr-complete.webp",
    ],
    description: "پروژهٔ مسکونی ۵ طبقهٔ ممتاز در محلهٔ ناران لواسان با ۳۲۰ متر زمین و دید کوهستان، هم‌اکنون در مرحلهٔ اجرای نمای آجری-سنگی و نازک‌کاری (۶۲٪ پیشرفت).",
    features: ["۳۲۰ متر زمین", "۴ خواب", "ساخت - فروش", "سند شش‌دانگ"],
    projectValuation: 52_800_000_000,
    targetCapital: 16_000_000_000,
    raisedCapital: 9_920_000_000,
    tokenName: "توکن خشت سپهر",
    tokenSymbol: "KH-LAVASAN",
    tokenPriceInitial: 650_000,
    tokenPriceCurrent: 675_000,
    totalTokenSupply: 81_230,
    availableTokenSupply: 30_150,
    simulatedHolders: 117,
    minimumInvestment: 650_000,
    minimumTokens: 1,
    estimatedReturnLow: 19,
    estimatedReturnBase: 29,
    estimatedReturnHigh: 36,
    rentalYield: 0,
    progress: 62,
    plannedProgress: 65,
    actualProgress: 62,
    riskLevel: "متوسط",
    lockup: "۱۵ تا ۲۰ ماه",
    exitStrategy: "فروش واحدها پس از تکمیل نازک‌کاری و معامله در بازار ثانویه",
    valuationDate: "۱۴۰۵/۰۴/۲۸",
    nextValuationDate: "۱۴۰۵/۰۷/۲۸",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 4 ? "done" : index === 4 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "اسکلت بتنی ۵ طبقه در لواسان",
        date: "مرحلهٔ ۱",
        progress: 25,
        note: "تکمیل فونداسیون و اسکلت بتنی ۵ طبقه با دید مستقیم کوهستان البرز.",
        image: "/pilot-assets/sepehr-stage-1.webp",
      },
      {
        stage: "اجرای نمای آجری و تراورتن",
        date: "مرحلهٔ ۲",
        progress: 62,
        note: "نصب نمای ترکیبی آجر گرم و سنگ تراورتن و قاب پنجره‌ها (فاز فعلی در ۶۲٪ پیشرفت).",
        image: "/pilot-assets/sepehr-stage-2.webp",
      },
      {
        stage: "نازک‌کاری داخلی و تأسیسات",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "اجرای کناف، کف‌سازی سنگی، کابینت‌ها و تأسیسات هوشمند واحدها.",
        image: "/pilot-assets/project-sarv-interior.webp",
      },
      {
        stage: "تکمیل نهایی ساختمان سپهر و روف‌گاردن",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "نمای نهایی ساختمان ۵ طبقهٔ سپهر در لواسان همراه با روف‌گاردن مشجر و لابی.",
        image: "/pilot-assets/project-sepehr-complete.webp",
      },
    ],
  },
  {
    slug: "mashhad-axis",
    name: "پروندهٔ آفتاب",
    location: "مشهد · خیابان امام‌رضا",
    type: "اجاره",
    investmentModel: "rent",
    status: "در حال جذب سرمایه",
    accent: "coral",
    image: "/pilot-assets/aftab-site-0.webp",
    gallery: [
      "/pilot-assets/aftab-site-0.webp",
      "/pilot-assets/aftab-stage-2.webp",
      "/pilot-assets/aftab-stage-3.webp",
      "/pilot-assets/aftab-stage-4.webp",
    ],
    description: "پروژهٔ احداث مجتمع تجاری ۳ طبقه با معماری طاق‌های آجری در محور خیابان امام‌رضای مشهد؛ هم‌اکنون در مرحلهٔ جذب سرمایهٔ اولیه (پیشرفت فیزیکی ساخت: ۰٪).",
    features: ["۱٬۱۰۰ متر", "واحدهای تجاری", "ساخت - اجاره", "حساب امانی بانکی"],
    projectValuation: 70_000_000_000,
    targetCapital: 21_000_000_000,
    raisedCapital: 5_460_000_000,
    tokenName: "توکن خشت آفتاب مشهد",
    tokenSymbol: "KH-AXIS",
    tokenPriceInitial: 900_000,
    tokenPriceCurrent: 900_000,
    totalTokenSupply: 77_770,
    availableTokenSupply: 71_703,
    simulatedHolders: 54,
    minimumInvestment: 900_000,
    minimumTokens: 1,
    estimatedReturnLow: 16,
    estimatedReturnBase: 25,
    estimatedReturnHigh: 31,
    rentalYield: 11,
    progress: 0,
    plannedProgress: 0,
    actualProgress: 0,
    riskLevel: "پایین",
    lockup: "۱۸ تا ۲۴ ماه",
    exitStrategy: "تکمیل جذب سرمایه، احداث و واریز عواید به کیف پول اجاره",
    valuationDate: "۱۴۰۵/۰۳/۳۰",
    nextValuationDate: "۱۴۰۵/۰۶/۳۰",
    lifecycle: commonLifecycle.map((item, index) => ({ ...item, status: index < 3 ? "done" : index === 3 ? "current" : "upcoming" })),
    documents: baseDocuments,
    progressUpdates: [
      {
        stage: "تجهیز زمین و جذب سرمایه (وضعیت فعلی: ۰٪ ساخت)",
        date: "مرحلهٔ ۱ (جاری)",
        progress: 25,
        note: "زمین حصارکشی‌شده در محور امام‌رضا مشهد و جذب سرمایه در حساب امانی پیش از شروع گودبرداری.",
        image: "/pilot-assets/aftab-site-0.webp",
      },
      {
        stage: "احداث اسکلت و طاق‌های آجری نما (فاز آتی)",
        date: "مرحلهٔ ۲",
        progress: 50,
        note: "اجرای اسکلت ۳ طبقهٔ تجاری و طاق‌های آجری شاخص در نمای اصلی بولوار.",
        image: "/pilot-assets/aftab-stage-2.webp",
      },
      {
        stage: "نازک‌کاری راهروها، وید شیشه‌ای و ویترین‌ها (فاز آتی)",
        date: "مرحلهٔ ۳",
        progress: 75,
        note: "اجرای سقف شیشه‌ای آتریوم مرکزی، ویترین واحدهای تجاری و سنگ‌فرش طبقات.",
        image: "/pilot-assets/aftab-stage-3.webp",
      },
      {
        stage: "تکمیل نهایی و بهره‌برداری مجتمع تجاری آفتاب",
        date: "مرحلهٔ ۴",
        progress: 100,
        note: "طرح نهایی مجتمع تجاری ۳ طبقهٔ آفتاب مشهد پس از افتتاح و شروع اجارهٔ واحدها.",
        image: "/pilot-assets/aftab-stage-4.webp",
      },
    ],
  },
];

export const projectProfiles: Record<string, ProjectProfile> = {
  "niavaran-flip": {
    overview: {
      what: "پروژهٔ بازسازی کامل و ارتقای مهندسی یک ملک ویلایی دوطبقه در نیاوران با هدف فروش در بازار مسکونی ممتاز شمال تهران.",
      where: "در محدودهٔ نیاوران در شمال تهران، در بافت مسکونی کم‌تراکم و دسترسی‌پذیر.",
      outcome: "فروش ملک بازسازی‌شده و تسویهٔ سود با دارندگان سهام همراه با نقدشوندگی در بازار ثانویه.",
    },
    geo: { city: "تهران", area: "نیاوران", coordinateLabel: "۳۵٫۸۲° شمالی · ۵۱٫۴۸° شرقی", context: "بافت مسکونی شمال تهران", lat: 35.818, lng: 51.4716, pin: { x: 72, y: 24 } },
    horizon: { pace: "زودبازده", duration: "۸ تا ۱۲ ماه", months: 10, breakEven: "پس از تکمیل بازسازی و فروش", cashflow: "تمرکز بر سود سرمایه‌ای فروش" },
    riskScenarios: [
      { title: "مدیریت هزینهٔ مصالح و نازک‌کاری", level: "متوسط", trigger: "تغییر قیمت مصالح ساختمانی در طول بازسازی", response: "اختصاص ۱۵٪ بودجهٔ ذخیرهٔ احتیاطی در حساب امانی پروژه | پیش‌خرید قطعی مصالح اصلی و تجهیزات در ابتدای پروژه | نظارت مستقیم مهندس ناظر و امین مالی بر تمامی صورت‌وضعیت‌ها" },
      { title: "کنترل زمان‌بندی اجرای بازسازی", level: "پایین", trigger: "هماهنگی اکیپ‌های اجرایی و تأسیساتی", response: "تدوین جدول زمان‌بندی هفتگی با تضمین حسن انجام کار پیمانکار | اخذ کلیهٔ مجوزهای بازسازی پیش از شروع عملیات کارگاهی | پایش مستمر پیشرفت فیزیکی و ثبت گزارش تصویری در اتاق اسناد" },
      { title: "تضمین نقدشوندگی و فروش در پایان دوره", level: "پایین", trigger: "شرایط تقاضا در زمان عرضهٔ ملک", response: "تدوین ۳ سناریوی قیمت‌گذاری فروش (محافظه‌کارانه، پایه و خوش‌بینانه) | همکاری با کارگزاری‌های تخصصی املاک منطقه ۱ جهت پیش‌بازاریابی | فعال بودن تابلوی بازار ثانویه برای فروش سهام در هر لحظه" },
    ],
    simulation: { defaultAmount: 100_000_000, assumptions: ["محاسبات بر اساس گزارش کارشناسی رسمی پروژه انجام شده است", "معاملات سهام در طول دوره در بازار ثانویه فعال است"] },
  },
  "shahrak-west": {
    overview: { what: "پروژهٔ ساخت مسکونی مدرن ۶ طبقه در شهرک غرب تهران با پیشرفت فیزیکی ۷۴٪ در مرحلهٔ نازک‌کاری.", where: "در محدودهٔ شهرک غرب تهران، با دسترسی عالی و تقاضای مصرفی بالا.", outcome: "تکمیل ساخت، فروش واحدها و تقسیم سود بین سرمایه‌گذاران." },
    geo: { city: "تهران", area: "شهرک غرب", coordinateLabel: "۳۵٫۷۶° شمالی · ۵۱٫۳۷° شرقی", context: "بافت مسکونی غرب تهران", lat: 35.7589, lng: 51.3708, pin: { x: 48, y: 48 } },
    horizon: { pace: "میان‌مدت", duration: "۱۲ تا ۱۵ ماه", months: 15, breakEven: "پس از تکمیل نازک‌کاری و تحویل", cashflow: "رشد ارزش ساخت و فروش نهایی" },
    riskScenarios: [
      { title: "پایش برنامهٔ زمان‌بندی ساخت", level: "پایین", trigger: "هماهنگی فاز نازک‌کاری و انشعابات", response: "پایش ماهانهٔ پیشرفت فیزیکی توسط مهندس ناظر مقیم و ثبت در اتاق داده | آزادسازی مرحله‌ای بودجهٔ ساخت متناسب با صورت‌وضعیت‌های تأییدشده | تأمین کامل تجهیزات تأسیساتی و آسانسور در انبار پروژه" },
      { title: "شفافیت مدارک ثبتی و فنی", level: "پایین", trigger: "تطبیق نقشه‌های معماری و پروانه", response: "بارگذاری کامل نقشه‌های مصوب و پروانهٔ ساختمانی در اتاق اسناد | تطبیق اسناد ثبتی و فنی توسط بازبین مستقل | ثبت گواهی صحت مستندات برای تمامی سهام‌داران" },
      { title: "تضمین نقدشوندگی بازار ثانویه", level: "پایین", trigger: "نیاز سرمایه‌گذار به خروج پیش از موعد", response: "بروزرسانی دوره‌ای ارزش روز ملک بر اساس معاملات شهرک غرب | حضور صندوق بازارگردان در تابلوی بازار ثانویه | نقدشوندگی پیوستهٔ سهام در تمامی روزهای هفته" },
    ],
    simulation: { defaultAmount: 50_000_000, assumptions: ["پروژه ۷۴٪ پیشرفت فیزیکی واقعی دارد", "مبنای محاسبه قیمت هر سهم و برنامهٔ مالی مصوب پروژه است"] },
  },
  "narvan-renovation": {
    overview: { what: "ساختمان اداری ۴ طبقهٔ تکمیل‌شده در میدان ونک با ۱۴ واحد فعال و جریان پایدار درآمد اجاره.", where: "در محدودهٔ ونک تهران، با کاربری اداری و مستأجران شرکتی.", outcome: "واریز منظم عواید اجاره به کیف پول اجارهٔ سهام‌داران و رشد ارزش دارایی." },
    geo: { city: "تهران", area: "ونک", coordinateLabel: "۳۵٫۷۶° شمالی · ۵۱٫۴۱° شرقی", context: "محور اداری مرکزی تهران", lat: 35.7575, lng: 51.41, pin: { x: 62, y: 49 } },
    horizon: { pace: "میان‌مدت", duration: "۹ تا ۱۲ ماه", months: 10, breakEven: "دارای جریان نقدی فعال از ماه اول", cashflow: "واریز دوره‌ای به کیف پول اجاره + رشد ارزش" },
    riskScenarios: [
      { title: "پایداری ضریب اشغال واحدها", level: "پایین", trigger: "تمدید قراردادهای اجارهٔ شرکتی", response: "عقد قراردادهای اجارهٔ بلندمدت شرکتی با اخذ تضامین معتبر بانکی | استقرار در قطب اداری میدان ونک با ضریب اشغال بالای ۹۵٪ | بازاریابی پیش از سررسید قراردادها برای تداوم بدون وقفهٔ درآمد اجاره" },
      { title: "پوشش هزینه‌های نگهداری و مشاعات", level: "پایین", trigger: "سرویس دوره‌ای تأسیسات ساختمان", response: "بیمهٔ کامل تمام‌خطر ساختمان و تأسیسات مرکزی | پرداخت هزینه‌های شارژ جاری توسط مستأجران طبق قرارداد | انتشار صورت‌های مالی شفاف در اتاق داده" },
      { title: "تضمین حقوقی قراردادهای اجاره", level: "پایین", trigger: "تعدیل سالانهٔ نرخ اجاره", response: "ممیزی تمامی قراردادهای اجاره توسط مشاور حقوقی مستقل | ثبت شروط تعدیل سالانهٔ اجاره‌بها متناسب با نرخ رشد بازار | نگهداری اسناد تضمین در صندوق امانی پروژه" },
    ],
    simulation: { defaultAmount: 50_000_000, assumptions: ["عواید اجاره مستقیماً به کیف پول اجارهٔ شما واریز می‌شود", "اصل سهام نیز در بازار ثانویه قابل معامله است"] },
  },
  "kish-marina": {
    overview: { what: "مجموعهٔ اقامتی ساحلی در مارینای کیش در حال ساخت (۴۸٪ پیشرفت) با مدل بهره‌برداری اجاره‌ای.", where: "در محدودهٔ مارینای کیش، در بافت ساحلی و گردشگری ممتاز.", outcome: "تکمیل ساخت و توزیع عواید اجارهٔ اقامتی در کیف پول اجارهٔ سهام‌داران." },
    geo: { city: "کیش", area: "مارینا", coordinateLabel: "۲۶٫۵۴° شمالی · ۵۳٫۹۸° شرقی", context: "بافت ساحلی و گردشگری", lat: 26.5385, lng: 54.0195, pin: { x: 26, y: 80 } },
    horizon: { pace: "میان‌مدت", duration: "۱۲ تا ۱۸ ماه", months: 15, breakEven: "پس از تکمیل ساخت و شروع بهره‌برداری", cashflow: "عواید کیف پول اجاره و رشد ارزش ملک ساحلی" },
    riskScenarios: [
      { title: "تثبیت درآمد در تمامی فصول سال", level: "پایین", trigger: "تغییرات فصلی تقاضای گردشگری", response: "ذخیره‌سازی بخشی از مازاد درآمد فصل‌های اوج سفر برای پوشش یکنواخت تمام ماه‌ها | عقد قرارداد با شرکت‌ها و سازمان‌ها برای اقامت‌های سالانه | مدیریت هوشمند نرخ‌گذاری توسط اپراتور تخصصی هتلداری" },
      { title: "کنترل کیفیت ساخت و تجهیز", level: "پایین", trigger: "استاندارد تجهیزات ساحلی", response: "استفاده از متریال مقاوم در برابر رطوبت با گارانتی معتبر | بازرسی مرحله‌ای توسط مهندس ناظر مقیم | آزادسازی وجوه ساخت از حساب امانی صرفاً بر اساس پیشرفت واقعی" },
      { title: "تضامین حقوقی منطقهٔ آزاد کیش", level: "پایین", trigger: "مجوزهای بهره‌برداری اقامتی", response: "اخذ کامل مجوزهای ساخت و بهره‌برداری از سازمان منطقهٔ آزاد کیش | ثبت رسمی حقوق سرمایه‌گذاران در نهاد امانی | امکان معاملهٔ آنی سهام در بازار ثانویه" },
    ],
    simulation: { defaultAmount: 75_000_000, assumptions: ["مدل درآمدی ترکیبی از رشد ارزش ساخت و عواید اجاره است", "گزارش پیشرفت و عواید به‌صورت دوره‌ای منتشر می‌شود"] },
  },
  "mirdamad-office": {
    overview: { what: "ساختمان ۵ طبقهٔ اداری-تجاری تکمیل‌شده در بلوار میرداماد با مستأجر شرکتی فعال و درآمد اجارهٔ ماهانه.", where: "در محدودهٔ میرداماد تهران و در پهنهٔ اداری با دسترسی مستقیم مترو.", outcome: "واریز منظم عواید ماهانه به کیف پول اجاره و نقدشوندگی در بازار ثانویه." },
    geo: { city: "تهران", area: "میرداماد", coordinateLabel: "۳۵٫۷۶° شمالی · ۵۱٫۴۳° شرقی", context: "پهنهٔ اداری شمال‌مرکزی تهران", lat: 35.7601, lng: 51.4339, pin: { x: 66, y: 43 } },
    horizon: { pace: "زودبازده", duration: "۶ تا ۱۲ ماه", months: 8, breakEven: "درآمد اجارهٔ فعال از روز نخست", cashflow: "واریز ماهانه به کیف پول اجاره" },
    riskScenarios: [
      { title: "تداوم قرارداد مستأجر شرکتی", level: "پایین", trigger: "سررسید سالانهٔ قرارداد اجاره", response: "الزام مستأجر به اعلام تمدید حداقل ۳ ماه پیش از پایان قرارداد | اخذ ودیعه و ضمانت‌نامهٔ بانکی معتبر جهت تضمین پرداخت به‌موقع اجاره | موقعیت ممتاز جنب مترو میرداماد با تقاضای بسیار بالای شرکت‌ها" },
      { title: "حفظ و ارتقای ارزش ملک اداری", level: "پایین", trigger: "ارزیابی دوره‌ای بازار اداری", response: "ارزیابی فصلی ملک توسط کارشناس رسمی دادگستری | نگهداری استاندارد لابی و مشاعات برای حفظ ارزش ممتاز ساختمان | امکان فروش سهام در بازار ثانویه به قیمت روز" },
      { title: "پوشش بیمه‌ای و نگهداشت فنی", level: "پایین", trigger: "سرویس تأسیسات و مشاعات", response: "پوشش کامل بیمهٔ آتش‌سوزی، زلزله و مسئولیت | تحویل و پایش واحد طبق چک‌لیست فنی استاندارد | انجام سرویس‌های پیشگیرانه بدون وقفه در بهره‌برداری" },
    ],
    simulation: { defaultAmount: 100_000_000, assumptions: ["سود اجارهٔ ماهانه به کیف پول اجارهٔ شما واریز می‌شود", "هر سهم در تابلوی بازار ثانویه قابل خرید و فروش است"] },
  },
  "lavasan-garden": {
    overview: { what: "پروژهٔ ساخت ساختمان مسکونی ۵ طبقه در محلهٔ ناران لواسان با ۶۲٪ پیشرفت فیزیکی.", where: "در محدودهٔ ناران لواسان، با زمین مستقل شش‌دانگ و دید کوهستان البرز.", outcome: "تکمیل نازک‌کاری، فروش واحدها و تقسیم سود سرمایه‌ای بین سهام‌داران." },
    geo: { city: "لواسان", area: "ناران", coordinateLabel: "۳۵٫۸۲° شمالی · ۵۱٫۶۴° شرقی", context: "بافت مسکونی ممتاز لواسان", lat: 35.823, lng: 51.6375, pin: { x: 88, y: 19 } },
    horizon: { pace: "میان‌مدت", duration: "۱۵ تا ۲۰ ماه", months: 18, breakEven: "پس از تکمیل نازک‌کاری و فروش", cashflow: "سود سرمایه‌ای حاصل از ساخت و فروش" },
    riskScenarios: [
      { title: "اصالت سند و مجوزهای ساخت", level: "پایین", trigger: "استعلام‌های ثبتی و شهرداری", response: "اخذ کامل پروانهٔ ساختمانی و استعلام عدم خلافی از شهرداری لواسان | تأیید اصالت سند شش‌دانگ و نقشهٔ UTM توسط کارشناس رسمی دادگستری | دسترسی کامل سرمایه‌گذاران به اسناد ثبتی در اتاق داده" },
      { title: "مدیریت بودجهٔ نازک‌کاری و نما", level: "پایین", trigger: "تکمیل نمای سنگی-آجری و تأسیسات", response: "قرارداد پیمان با سقف هزینهٔ معین و نظارت حساب امانی | خرید پیش‌هنگام تجهیزات موتورخانه و سنگ نما | گزارش‌دهی فصلی هزینه‌ها و پیشرفت به سهام‌داران" },
      { title: "نقدشوندگی در بازار ثانویه", level: "پایین", trigger: "معاملهٔ سهام پیش از فروش نهایی", response: "امکان خرید و فروش روزانهٔ سهام در بازار ثانویهٔ خشت | ارزیابی فصلی ارزش روز ملک توسط کارشناس مستقل | پشتیبانی بازارگردان از صف‌های معاملاتی" },
    ],
    simulation: { defaultAmount: 65_000_000, assumptions: ["پروژه دارای سند شش‌دانگ و ۶۲٪ پیشرفت ساخت است", "سهام پروژه در بازار ثانویه قابل معامله است"] },
  },
  "mashhad-axis": {
    overview: { what: "پروژهٔ احداث و بهره‌برداری مجتمع تجاری ۳ طبقه در خیابان امام‌رضای مشهد (هم‌اکنون در مرحلهٔ جذب سرمایه با ۰٪ ساخت فیزیکی).", where: "در محدودهٔ خیابان امام‌رضای مشهد، با موقعیت تجاری پرتردد و زائرپذیر.", outcome: "تکمیل جذب سرمایه، اجرای ساخت و توزیع عواید در کیف پول اجارهٔ سهام‌داران." },
    geo: { city: "مشهد", area: "محور امام‌رضا", coordinateLabel: "۳۶٫۲۸° شمالی · ۵۹٫۶۰° شرقی", context: "بافت تجاری و زائرپذیر", lat: 36.28, lng: 59.605, pin: { x: 81, y: 66 } },
    horizon: { pace: "میان‌مدت", duration: "۱۸ تا ۲۴ ماه", months: 20, breakEven: "پس از تکمیل ساخت و شروع اجارهٔ تجاری", cashflow: "رشد ارزش ساخت + واریز به کیف پول اجاره" },
    riskScenarios: [
      { title: "حفاظت از وجوه در مرحلهٔ جذب سرمایه", level: "پایین", trigger: "نگهداری سرمایه تا تکمیل ظرفیت", response: "نگهداری ۱۰۰٪ وجوه جذب‌شده در حساب امانی بانکی تحت نظارت امین دارایی | تخصیص سود روزشمار سپردهٔ امانی در طول دورهٔ جذب سرمایه | شروع عملیات ساخت بلافاصله پس از تکمیل گام جذب سرمایه" },
      { title: "تضمین تقاضای اجارهٔ واحدهای تجاری", level: "پایین", trigger: "بهره‌برداری از واحدهای تجاری محور امام‌رضا", response: "موقعیت ممتاز در پرترددترین محور تجاری-زیارتی مشهد با تقاضای مستمر | انعقاد تفاهم‌نامهٔ پیش‌اجاره با برندها و فروشگاه‌های معتبر | تنوع متراژ واحدهای تجاری برای پوشش اصناف مختلف" },
      { title: "شفافیت حقوقی و حسابرسی مستمر", level: "پایین", trigger: "نظارت بر قراردادهای ساخت و اجاره", response: "ثبت رسمی سند زمین در ساختار حقوقی پروژه | حسابرسی دوره‌ای تمامی تراکنش‌ها و صورت‌وضعیت‌ها | امکان فروش سهام در تابلوی بازار ثانویه در تمام مراحل" },
    ],
    simulation: { defaultAmount: 90_000_000, assumptions: ["پروژه هم‌اکنون در مرحلهٔ جذب سرمایه است و پیشرفت فیزیکی ساخت ۰٪ است", "وجوه تا شروع ساخت در حساب امانی بانکی نگهداری می‌شود"] },
  },
};

export const tiers: Array<{
  id: InvestorTier;
  name: string;
  detail: string;
  access: string;
  color: string;
  minInvestmentToman: number;
  feeDiscountPercent: number;
  dailyWithdrawalLimitToman: number;
  benefits: string[];
}> = [
  {
    id: "bronze",
    name: "برنزی",
    detail: "سرمایهٔ پایه (تا ۵۰ میلیون تومان)",
    access: "دسترسی به خلاصهٔ پروژه‌ها، گزارش‌های پیشرفت عمومی و بازار ثانویه",
    color: "#b56f4a",
    minInvestmentToman: 0,
    feeDiscountPercent: 0,
    dailyWithdrawalLimitToman: 100_000_000,
    benefits: [
      "خرید و فروش آنی سهام در عرضهٔ اولیه و بازار ثانویه",
      "دریافت عواید ماهانه در کیف پول اجاره",
      "دسترسی به خلاصهٔ پروژه و گزارش پیشرفت دوره‌ای در اتاق داده",
    ],
  },
  {
    id: "silver",
    name: "نقره‌ای",
    detail: "سرمایهٔ متوسط (۵۰ تا ۲۰۰ میلیون تومان)",
    access: "گزارش‌های ارزش‌گذاری کارشناسی، صورت‌های مالی و تخفیف کارمزد ۱۵٪",
    color: "#64748b",
    minInvestmentToman: 50_000_000,
    feeDiscountPercent: 15,
    dailyWithdrawalLimitToman: 300_000_000,
    benefits: [
      "۱۵٪ تخفیف کارمزد معاملات در تابلوی بازار ثانویه",
      "دسترسی به گزارش‌های ارزش‌گذاری کارشناسی رسمی در اتاق داده",
      "امکان ذخیرهٔ تا ۲۰ سناریوی اختصاصی در استودیو مدیریت ثروت",
    ],
  },
  {
    id: "gold",
    name: "طلایی",
    detail: "سرمایهٔ بالا (۲۰۰ تا ۵۰۰ میلیون تومان)",
    access: "دسترسی کامل به دفترچهٔ فنی، مدل مالی اکسل، ضمائم حقوقی و تخفیف کارمزد ۳۰٪",
    color: "#b79042",
    minInvestmentToman: 200_000_000,
    feeDiscountPercent: 30,
    dailyWithdrawalLimitToman: 1_000_000_000,
    benefits: [
      "۳۰٪ تخفیف کارمزد معاملات در بازار ثانویه",
      "دسترسی به دفترچهٔ فنی، مدل مالی تفصیلی (XLSX) و ضمائم قراردادی",
      "اولویت تخصیص سهام در عرضه‌های اولیهٔ زودبازده",
    ],
  },
  {
    id: "titanium",
    name: "تیتانیومی",
    detail: "سرمایهٔ ویژه (بالای ۵۰۰ میلیون تومان)",
    access: "دسترسی VIP به کلیهٔ اسناد حساب امانی، مشاور اختصاصی و ۵۰٪ تخفیف کارمزد",
    color: "#191970",
    minInvestmentToman: 500_000_000,
    feeDiscountPercent: 50,
    dailyWithdrawalLimitToman: 5_000_000_000,
    benefits: [
      "۵۰٪ تخفیف کارمزد معاملات بازار ثانویه و تسویهٔ ویژه",
      "دسترسی کامل به تمامی اسناد سطح تیتانیومی، پلاک ثبتی و قراردادهای حساب امانی",
      "مشاور اختصاصی مدیریت ثروت و اولویت اول در پروژه‌های ویلایی و خاص",
    ],
  },
];

export function resolveTierByInvestment(investedToman: number, overrideTier?: string | null) {
  if (overrideTier) {
    const found = tiers.find((t) => t.id === overrideTier || t.name === overrideTier);
    if (found) return found;
  }
  if (investedToman >= 500_000_000) return tiers[3];
  if (investedToman >= 200_000_000) return tiers[2];
  if (investedToman >= 50_000_000) return tiers[1];
  return tiers[0];
}

export const formatToman = (value: number) => new Intl.NumberFormat("fa-IR").format(Math.round(value));
export const formatCompactToman = (value: number) => {
  if (value >= 1_000_000_000) return `${formatToman(value / 1_000_000_000)} میلیارد`;
  if (value >= 1_000_000) return `${formatToman(value / 1_000_000)} میلیون`;
  return formatToman(value);
};

export const legalDisclaimerShort =
  "خشت بستر شفاف بررسی اسناد، خرید سهام پروژه‌های ملکی و معامله در بازار ثانویه است؛ تمامی پروژه‌ها دارای پشتوانهٔ اسناد ثبتی و حساب امانی هستند.";

export const legalDisclaimer =
  "در پلتفرم خشت، اطلاعات فنی، مالی و حقوقی هر پروژه به همراه سناریوهای سود، کیف پول اجاره و تابلوی بازار ثانویه به‌صورت شفاف ارائه می‌شود. تمامی پروژه‌ها تحت نظارت مهندس ناظر و حساب امانی مدیریت می‌گردند.";
