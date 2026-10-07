import { redirect } from "next/navigation";
import { requirePropertyManager } from "@/lib/auth";
import PropertyShell from "@/components/property/PropertyShell";
export const dynamic = "force-dynamic";
export default async function Layout({children}: {children: React.ReactNode}) {
  let profile;
  try {profile = await requirePropertyManager();} catch {redirect("/property/login");}
  return <PropertyShell isAdmin={profile.role === "admin"} actorId={profile.id}>{children}</PropertyShell>;
}
