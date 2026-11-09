export type ProjectMetric={slug:string;name:string;riskLevel:'پایین'|'متوسط'|'بالا';months:number;readiness:number;dataQuality:number;planRevision:number|null;rates:{conservative:number;base:number;optimistic:number}|null;unavailableReason:string|null};
export type AnalysisStyle='guarded'|'balanced'|'growth';
// Comparison heuristic, not an optimized portfolio or an investment recommendation.
export function compareProjects(metrics:ProjectMetric[],style:AnalysisStyle,horizon:number){
 const riskWeight={پایین:94,متوسط:68,بالا:42};
 const rows=metrics.map(m=>{const returnRate=m.rates?.[style==='guarded'?'conservative':style==='growth'?'optimistic':'base']??null,risk=riskWeight[m.riskLevel],timeFit=Math.max(0,100-Math.abs(m.months-horizon)*6);return {...m,projectSlug:m.slug,returnRate,risk,timeFit,decisionFit:Math.round(m.readiness*.28+m.dataQuality*.22+timeFit*.2+risk*.3),factor:style==='guarded'?risk:style==='growth'?Math.max(1,(returnRate??0)+100):1};});
 const sum=rows.reduce((s,m)=>s+m.factor,0)||1,allocations=rows.map(m=>({...m,weight:Math.round(m.factor/sum*100)}));if(allocations.length)allocations[0].weight+=100-allocations.reduce((s,m)=>s+m.weight,0);
 const complete=allocations.length>0&&allocations.every(m=>m.returnRate!==null);
 return {method:'case-plan-comparison-v2',generatedAt:Date.now(),complete,weightedReturn:complete?allocations.reduce((s,m)=>s+m.returnRate!*m.weight/100,0):null,weightedRisk:allocations.reduce((s,m)=>s+m.risk*m.weight/100,0),weightedReadiness:allocations.reduce((s,m)=>s+m.readiness*m.weight/100,0),allocations};
}
