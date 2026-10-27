export function dashboardBackLink(pathname: string) {
  if (pathname === "/dashboard" || !pathname.startsWith("/dashboard/")) return null;
  for (const [prefix, href, label] of [
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
