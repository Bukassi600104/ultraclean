import { notFound } from "next/navigation";
import { isPropertySection } from "@/lib/property";
import PropertyWorkspace from "@/components/property/PropertyWorkspace";
export default function Page({params}: {params: {section: string}}) {
  if (!isPropertySection(params.section) && params.section !== "history") notFound();
  return <PropertyWorkspace section={params.section as "history" | keyof typeof import("@/lib/property").propertyKinds} />;
}
