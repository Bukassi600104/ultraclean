import "server-only";
import type {Profile} from "@/lib/auth";
import {createServerClient} from "@/lib/supabase/server";
import {sumMoney} from "./money";

const eligibleManagers=new Set(["ca7d7137-72dc-4cbc-848d-beb56d951344","a1e4ad6e-a565-4330-ae4c-3a0bc92081d1"]);
export type LegacyManagerSnapshot={target:{id:string;name:string|null};asOf:string;sheets:{name:string;rows:Record<string,unknown>[]}[];summary:Record<string,string|number|null>;attributionNotes:string[]};
export function canExportLegacyManager(actor:Profile|null,targetId:string):boolean{
 return !!actor&&!actor.suspended&&eligibleManagers.has(targetId)&&(actor.role==="admin"||actor.role==="manager"&&actor.id===targetId);
}
export async function getLegacyManagerSnapshot(actor:Profile,targetId:string):Promise<LegacyManagerSnapshot>{
 if(!canExportLegacyManager(actor,targetId))throw Object.assign(Error("Historical export is unavailable for this account"),{code:"42501"});
 const db=createServerClient();if(!db)throw Error("Historical export is unavailable");
 const {data,error}=await db.rpc("manager_legacy_export_snapshot",{p_actor:actor.id,p_target:targetId});if(error)throw error;
 if(data?.target?.id!==targetId||typeof data.asOf!=="string"||!/^\d{4}-\d{2}-\d{2}T/.test(data.asOf)||!Number.isFinite(Date.parse(data.asOf))||!Array.isArray(data.sheets)||!data.sheets.every((s:{name?:unknown;rows?:unknown})=>typeof s.name==="string"&&Array.isArray(s.rows))||!data.summary||!Array.isArray(data.attributionNotes))throw Error("The historical export snapshot could not be verified");
 return data;
}
function title(key:string){if(key==="_source_json")return "Original source JSON";const text=key.replace(/_exact$/," (exact)").replaceAll("_"," ");return text[0].toUpperCase()+text.slice(1);}
function chunks(value:unknown):(string|number|boolean|null)[]{
 if(value==null)return [null];if(typeof value==="number"||typeof value==="boolean")return [value];
 const text=typeof value==="string"?value:JSON.stringify(value),parts:string[]=[];
 for(let start=0;start<text.length;){let end=Math.min(start+32700,text.length);const code=text.charCodeAt(end-1);if(end<text.length&&code>=0xD800&&code<=0xDBFF)end--;parts.push(text.slice(start,end));start=end;}
 return parts.length?parts:[""];
}
function excelAmount(value:unknown):number|null{
 if(typeof value!=="string"||! /^-?\d+(?:\.\d{1,2})?$/.test(value))return null;
 const exact=sumMoney([value]),digits=exact.replace(/[-.]/g,"").replace(/^0+/,""),number=Number(exact);
 return digits.length<=15&&Number.isFinite(number)&&sumMoney([String(number),exact.startsWith("-")?exact.slice(1):"-"+exact]).replace(/[.0-]/g,"")===""?number:null;
}
export async function buildLegacyManagerWorkbook(snapshot:LegacyManagerSnapshot):Promise<Uint8Array>{
 const {default:ExcelJS}=await import("exceljs"),workbook=new ExcelJS.Workbook();workbook.creator="Primefield Farm";workbook.created=new Date(snapshot.asOf);
 const summary=workbook.addWorksheet("Summary");summary.columns=[{header:"Item",width:44},{header:"Recorded value",width:60}];
 summary.addRows([["Manager",snapshot.target.name||"Name not recorded"],["Account ID",snapshot.target.id],["Snapshot recorded at",snapshot.asOf],...Object.entries(snapshot.summary).map(([name,value])=>[name,value??"Not verified"]),["Excel precision","Exact text preserves every saved digit. A blank number companion cell is not zero; Excel cannot safely represent that saved precision."],...snapshot.attributionNotes.map(note=>["Attribution note",note])]);
 for(const source of snapshot.sheets){
  const name=source.name.replace(/[\\/?*\[\]:]/g," ").slice(0,31);if(!name||workbook.getWorksheet(name))throw Error("Historical source sheets must have distinct names");
  if(source.rows.length>1048575)throw Error("This history exceeds one Excel worksheet; no partial export was created");
  const sheet=workbook.addWorksheet(name),keys=Array.from(new Set(source.rows.flatMap(row=>Object.keys(row)))),fields=keys.length?keys:["id"];
  const columns=fields.flatMap(key=>{const count=source.rows.reduce((n,row)=>Math.max(n,chunks(row[key]).length),1);return Array.from({length:count},(_,part)=>({key,part,header:title(key)+(part?` (part ${part+1})`:"")}));});
  const moneyFields=keys.filter(key=>key.endsWith("_exact"));if(columns.length+moneyFields.length>16384)throw Error("The saved source exceeds Excel column limits; no values were truncated");
  sheet.addRow([...columns.map(c=>c.header),...moneyFields.map(key=>title(key.replace(/_exact$/,""))+" (number)")]);
  for(const row of source.rows)sheet.addRow([...columns.map(c=>chunks(row[c.key])[c.part]??null),...moneyFields.map(key=>excelAmount(row[key]))]);
  for(let i=0;i<columns.length;i++)sheet.getColumn(i+1).width=columns[i].key==="id"?38:columns[i].key==="_source_json"?70:28;
  moneyFields.forEach((_,i)=>{const column=sheet.getColumn(columns.length+i+1);column.width=24;column.numFmt="#,##0.00;[Red]-#,##0.00";});
  sheet.views=[{state:"frozen",ySplit:1}];sheet.autoFilter={from:{row:1,column:1},to:{row:1,column:columns.length+moneyFields.length}};
 }
 for(const sheet of workbook.worksheets){sheet.getRow(1).font={bold:true,color:{argb:"FFFFFFFF"}};sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF14532D"}};sheet.eachRow(row=>{row.alignment={vertical:"top",wrapText:sheet===summary||row.number===1};if(sheet===summary)row.height=48;});sheet.getRow(1).height=32;}
 return new Uint8Array(await workbook.xlsx.writeBuffer());
}
