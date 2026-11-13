export type MoneyInput = string | number;
const powerOfTen = (scale: number) => BigInt("1" + "0".repeat(scale));

function decimal(value: MoneyInput): {units: bigint; scale: number} {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(value));
  if (!match || (typeof value !== "string" && typeof value !== "number")) throw new Error("Invalid saved financial amount");
  const [,sign, whole, fraction = "", exponent = "0"] = match;
  let scale = fraction.length - Number(exponent), units = BigInt(whole + fraction) * (sign === "-" ? -BigInt(1) : BigInt(1));
  if (!Number.isSafeInteger(scale) || Math.abs(scale) > 16383) throw new Error("Saved amount exceeds supported precision");
  if (scale < 0) {units *= powerOfTen(-scale);scale = 0;}
  return {units, scale};
}

function decimalText(units:bigint,scale:number):string {
  const negative = units < BigInt(0), digits = (negative ? -units : units).toString().padStart(scale + 1,"0");
  return (negative ? "-" : "") + (scale ? digits.slice(0,-scale) + "." + digits.slice(-scale) : digits);
}
/** Preserve legacy fractional digits until the final display boundary. */
export function sumMoney(values: MoneyInput[]): string {
  const rows = values.map(decimal), scale = rows.reduce((max,row)=>Math.max(max,row.scale),0);
  return decimalText(rows.reduce((sum,row) => sum + row.units * powerOfTen(scale - row.scale), BigInt(0)),scale);
}
export function multiplyMoney(left:MoneyInput,right:MoneyInput):string {
 const a=decimal(left),b=decimal(right);if(a.scale+b.scale>16383)throw Error("Amount exceeds supported precision");return decimalText(a.units*b.units,a.scale+b.scale);
}

export function subtractMoney(value: MoneyInput, ...costs: MoneyInput[]): string {
  return sumMoney([value, ...costs.map(cost => {const normalized=sumMoney([cost]);return normalized.startsWith("-")?normalized.slice(1):"-"+normalized;})]);
}
// Ledger arithmetic retains its full precision. Round once when presenting a currency amount.
function moneyCents(value:MoneyInput):bigint {
 const {units,scale}=decimal(value);
 if(scale<=2)return units*powerOfTen(2-scale);
 const divisor=powerOfTen(scale-2),absolute=units<BigInt(0)?-units:units;
 const rounded=(absolute+divisor/BigInt(2))/divisor;
 return units<BigInt(0)?-rounded:rounded;
}

export function formatExactCurrency(value:MoneyInput,currency:string):string{
 const text=decimalText(moneyCents(value),2),[whole,fraction]=text.replace(/^-/,"").split(".");
 return `${currency} ${text.startsWith("-")?"-":""}${BigInt(whole).toLocaleString("en-NG")}.${fraction}`;
}

/** Reject numbers whose cents cannot survive JSON transport. */
export function moneyNumber(value:MoneyInput):number {
 const cents=moneyCents(value);
 if(cents>BigInt(Number.MAX_SAFE_INTEGER)||cents<-BigInt(Number.MAX_SAFE_INTEGER))throw new Error("Financial amount exceeds the supported display range");
 const text=decimalText(cents,2),result=Number(text);
 if(result.toFixed(2)!==text)throw new Error("Financial amount exceeds supported cent precision");
 return result;
}
