export function farmReadDates(params: URLSearchParams) {
  const date = params.get("date"), from = params.get("from"), to = params.get("to");
  for (const value of [date, from, to]) if (value !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error("Choose valid calendar dates");
  if ((date && (from || to)) || (from && to && from > to)) throw new Error("Choose one valid date or date range");
  return { date, from, to };
}
