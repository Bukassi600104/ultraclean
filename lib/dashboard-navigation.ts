export function farmPerformanceBackLink(pathname: string, search = "") {
  const destinations: Record<string,string[]> = {
    "/dashboard/farm/today": ["/dashboard/farm/performance"],
    "/manager/today": ["/manager/performance", "/performance"],
    "/today": ["/manager/performance", "/performance"],
  };
  const source = new URLSearchParams(search), destination = source.get("return_to");
  if (!destination || !destinations[pathname]?.includes(destination)) return null;
  const filters = new URLSearchParams();
  for (const key of ["from", "to", "period_id", "site_id", "batch_id"]) {
    const value = source.get(key);
    if (value) filters.set(key, value);
  }
  return {href: destination + (filters.size ? "?" + filters : ""), label: "Back to Batch Performance"};
}

export function dashboardBackLink(pathname: string) {
  if (pathname === "/dashboard" || !pathname.startsWith("/dashboard/")) return null;
  if(pathname==='/dashboard/farm/control'||pathname==='/dashboard/farm')return {href:'/dashboard',label:'Back to CEO Dashboard'};
  for (const [prefix, href, label] of [
    ["/dashboard/managers/", "/dashboard/managers", "Back to Manage Accounts"],
    ["/dashboard/dba/products/", "/dashboard/dba/products", "Back to Products"],
    ["/dashboard/blog/", "/dashboard/blog", "Back to Blog"],
    ["/dashboard/leads/", "/dashboard/leads", "Back to Leads"],
    ["/dashboard/farm/", "/dashboard/farm/control", "Back to Farm control centre"],
    ["/dashboard/ultratidy/", "/dashboard/ultratidy", "Back to UltraTidy Overview"],
    ["/dashboard/dba/", "/dashboard/dba", "Back to DBA Overview"],
  ]) if (pathname.startsWith(prefix)) return { href, label };
  return { href: "/dashboard", label: "Back to CEO Dashboard" };
}

export function isDashboardDestinationActive(pathname: string, href: string, destinations: string[]) {
  const matches = destinations.filter(path => pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/")));
  const closest=matches.sort((a, b) => b.length - a.length)[0];
  return (closest || (pathname==='/dashboard/farm'||pathname.startsWith('/dashboard/farm/')?'/dashboard/farm/control':undefined)) === href;
}

export function farmManagerPrefix(pathname:string|null){return pathname&&/^\/manager(?:\/|$)/.test(pathname)?"/manager":"";}

export function operationalBackLink(pathname: string, app: "manager" | "property" | "content") {
  if (app !== "manager") return pathname === `/${app}` || pathname === `/${app}/login` ? null : {href:`/${app}`,label:`Back to ${app === "property" ? "Property" : "Content"} Overview`};
  const prefix = farmManagerPrefix(pathname), path = pathname.slice(prefix.length) || "/";
  if (path === "/" || path === "/login") return null;
  for (const [section,label] of [["sales","Sales"],["expenses","Expenses"],["daily-report","Daily Report"]]) {
    if (path.startsWith(`/${section}/`)) return {href:`${prefix}/${section}`,label:`Back to ${label}`};
  }
  return {href:prefix || "/",label:"Back to Farm Overview"};
}
