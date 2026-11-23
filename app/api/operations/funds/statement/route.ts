import {NextResponse} from "next/server";
import {z} from "zod";
import {getCashStatement} from "@/lib/cash-statement";
import {managerReadError,requestManagerScope} from "@/lib/manager-read-api";
import {cashError} from "@/lib/operations-cash";
import {businessSchema,cashDate} from "@/lib/operations-cash-validation";

export const runtime="nodejs";

const filters=z.object({
  business:businessSchema,from:cashDate.optional(),to:cashDate.optional(),
  page:z.coerce.number().int().min(0).max(2_147_483_647),limit:z.coerce.number().int().min(1).max(100),
  accountId:z.string().uuid().optional(),
}).refine(value=>!value.from || !value.to || value.from<=value.to);

export async function GET(request:Request){
  const p=new URL(request.url).searchParams;
  const parsed=filters.safeParse({
    business:p.get("business"),from:p.get("from")??undefined,to:p.get("to")??undefined,
    page:p.get("page")??0,limit:p.get("limit")??20,accountId:p.get("account_id")??undefined,
  });
  if(!parsed.success)return NextResponse.json({error:"Choose a valid date range and statement page."},{status:400});
  let scope;
  try{scope=await requestManagerScope(request,parsed.data.business);}
  catch(e){return managerReadError(e);}
  try{
    return NextResponse.json(await getCashStatement(scope,parsed.data),{headers:{"Cache-Control":"private, no-store"}});
  }catch(e){return cashError(e);}
}
