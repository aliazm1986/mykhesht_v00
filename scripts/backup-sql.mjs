import {readFile,writeFile} from "node:fs/promises";
import {pathToFileURL} from "node:url";
const allowed=new Set(["operationalEvidence","localAccounts","recordVersions","reviewRules","projectMemberships","caseArtifacts","pilotRecords","userProfiles","projectCases","caseStageDecisions","dataRoomDocuments","documentReviews","documentExtractions","sampleReports","wealthScenarios","auditEvents","projectDefinitions","financialRuns","memberDetails","supportTickets","ticketReplies","notifications","userWallets","shareHoldings","marketOrders","marketTrades"]);
const snake=s=>s.replace(/[A-Z]/g,c=>`_${c.toLowerCase()}`);
const quote=v=>v===null?"NULL":typeof v==="number"&&Number.isSafeInteger(v)?String(v):typeof v==="string"?`'${v.replaceAll("'","''")}'`:(()=>{throw Error("Unsupported backup value");})();
// Only use on a fresh, separately provisioned database after schema migrations.
// No DELETE, UPDATE, DROP or INSERT OR REPLACE is emitted.
export function backupStatements(snapshot){
 if(snapshot?.format!=="khesht-pilot-backup-v1"||!snapshot.tables||typeof snapshot.tables!=="object")throw Error("Invalid backup format");
 const statements=[];
 for(const[name,rows]of Object.entries(snapshot.tables)){
  if(!allowed.has(name)||!Array.isArray(rows)||rows.length>20_000)throw Error("Unsupported backup table");
  for(const row of rows){
   const keys=Object.keys(row);
   if(!keys.length||keys.some(k=>!/^[a-zA-Z][a-zA-Z0-9]*$/.test(k)))throw Error("Invalid backup columns");
   statements.push(`INSERT INTO "${snake(name)}" (${keys.map(k=>`"${snake(k)}"`).join(",")}) VALUES (${keys.map(k=>quote(row[k])).join(",")});`);
  }
 }
 return statements;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const[input,output]=process.argv.slice(2);
 if(!input||!output)throw Error("Usage: node scripts/backup-sql.mjs backup.json restore.sql");
 const bytes=await readFile(input);if(bytes.length>25*1024*1024)throw Error("Backup exceeds 25 MB");
 const statements=backupStatements(JSON.parse(bytes.toString("utf8")));
 await writeFile(output,statements.join("\n")+"\n",{flag:"wx"});
 console.log(`Created ${statements.length} insert statements for a fresh database. Existing output files are never overwritten.`);
}
