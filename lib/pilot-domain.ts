import { z } from "zod";

export const projectDefinitionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(70),
  name: z.string().trim().min(2).max(160), location: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(6000), outcome: z.string().trim().min(2).max(3000),
  investmentModel: z.enum(["hold", "flip", "rent"]), type: z.string().trim().min(2).max(60),
  horizonMonths: z.number().int().min(1).max(120), progress: z.number().min(0).max(100),
  riskLevel: z.enum(["پایین", "متوسط", "بالا"]),
  latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  image: z.string().regex(/^\/pilot-assets\/[a-zA-Z0-9_-]+\.(?:png|jpg|jpeg|webp)$/),
  risks: z.array(z.object({ title: z.string().trim().min(2).max(160), level: z.enum(["پایین", "متوسط", "بالا"]), trigger: z.string().trim().min(2).max(1000), response: z.string().trim().min(2).max(1500) })).max(12),
}).refine(d=>(d.latitude===null)===(d.longitude===null),{message:"طول و عرض جغرافیایی را با هم وارد کنید یا هر دو را خالی بگذارید."});
export type ProjectDefinition = z.infer<typeof projectDefinitionSchema>;
const money = z.number().finite().int().min(0).max(1_000_000_000_000_000);
export const financialInputSchema = z.object({
  acquisitionCost: money, renovationCost: money, otherCost: money, debt: money,
  debtAnnualRate: z.number().min(0).max(100), expectedExitValue: money,
  monthlyRent: money, monthlyExpenses: money,
  vacancyPercent: z.number().min(0).max(100), sellingFeePercent: z.number().min(0).max(30),
  durationMonths: z.number().int().min(1).max(120), investorAmount: money,
}).superRefine((v, ctx) => {
  const cost = v.acquisitionCost + v.renovationCost + v.otherCost;
  if (cost <= 0 || v.debt >= cost) ctx.addIssue({ code: "custom", message: "هزینهٔ اولیه باید مثبت و بیشتر از بدهی باشد." });
  if (v.investorAmount <= 0 || v.investorAmount > cost - v.debt) ctx.addIssue({ code: "custom", message: "مبلغ فرضی باید مثبت و حداکثر برابر آوردهٔ پروژه باشد." });
});
export type FinancialInput = z.infer<typeof financialInputSchema>;

// Educational exit-at-end model, no price approval, trading or payment logic.
export function calculateFinancialScenarios(raw: unknown) {
  const v = financialInputSchema.parse(raw);
  return ([
    { key: "conservative", label: "محافظه‌کارانه", exitFactor: .9, capexFactor: 1.15, delay: 3, vacancyAdd: 10 },
    { key: "base", label: "پایه", exitFactor: 1, capexFactor: 1, delay: 0, vacancyAdd: 0 },
    { key: "optimistic", label: "خوش‌بینانه", exitFactor: 1.1, capexFactor: 1, delay: -2, vacancyAdd: -5 },
  ] as const).map((s) => {
    const months = Math.max(1, v.durationMonths + s.delay);
    const totalCost = v.acquisitionCost + v.renovationCost * s.capexFactor + v.otherCost;
    const equity = totalCost - v.debt;
    const debtInterest = v.debt * v.debtAnnualRate / 100 * months / 12;
    const vacancy = Math.max(0, Math.min(100, v.vacancyPercent + s.vacancyAdd));
    const monthlyNetRent = v.monthlyRent * (1 - vacancy / 100) - v.monthlyExpenses;
    const rentalNet = monthlyNetRent * months;
    const grossExit = v.expectedExitValue * s.exitFactor;
    const sellingFee = grossExit * v.sellingFeePercent / 100;
    const netExit = grossExit - sellingFee - v.debt - debtInterest + rentalNet;
    const profit = netExit - equity;
    const roiPercent = profit / equity * 100;
    const annualizedPercent = netExit > 0 ? (Math.pow(netExit / equity, 12 / months) - 1) * 100 : null;
    return { key: s.key, label: s.label, months, totalCost, equity, debtInterest, rentalNet, grossExit, sellingFee, netExit, profit, roiPercent, annualizedPercent,
      investorProfit: v.investorAmount / equity * profit,
      investorFinalValue: v.investorAmount / equity * netExit,
      rentalPaybackMonths: monthlyNetRent > 0 ? equity / monthlyNetRent : null,
    };
  });
}
