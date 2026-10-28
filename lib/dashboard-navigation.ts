export function dashboardBackLink(pathname: string) {
  if (pathname === "/dashboard" || !pathname.startsWith("/dashboard/")) return null;
  for (const [prefix, href, label] of [
    ["/dashboard/managers/", "/dashboard/managers", "Back to Manage Accounts"],
    ["/dashboard/dba/products/", "/dashboard/dba/products", "Back to Products"],
    ["/dashboard/blog/", "/dashboard/blog", "Back to Blog"],
    ["/dashboard/leads/", "/dashboard/leads", "Back to Leads"],
    ["/dashboard/farm/", "/dashboard/farm", "Back to Farm Overview"],
    ["/dashboard/ultratidy/", "/dashboard/ultratidy", "Back to UltraTidy Overview"],
    ["/dashboard/dba/", "/dashboard/dba", "Back to DBA Overview"],
  ]) if (pathname.startsWith(prefix)) return { href, label };
  return { href: "/dashboard", label: "Back to CEO Dashboard" };
}

export function isDashboardDestinationActive(pathname: string, href: string, destinations: string[]) {
  const matches = destinations.filter(path => pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/")));
  return matches.sort((a, b) => b.length - a.length)[0] === href;
}

export function operationalBackLink(pathname: string, app: "manager" | "property" | "content") {
  if (app !== "manager") return pathname === `/${app}` || pathname === `/${app}/login` ? null : {href:`/${app}`,label:`Back to ${app === "property" ? "Property" : "Content"} Overview`};
  const prefix = /^\/manager(?:\/|$)/.test(pathname) ? "/manager" : "", path = pathname.slice(prefix.length) || "/";
  if (path === "/" || path === "/login") return null;
  for (const [section,label] of [["sales","Sales"],["expenses","Expenses"],["daily-report","Daily Report"]]) {
    if (path.startsWith(`/${section}/`)) return {href:`${prefix}/${section}`,label:`Back to ${label}`};
  }
  return {href:prefix || "/",label:"Back to Farm Overview"};
}
