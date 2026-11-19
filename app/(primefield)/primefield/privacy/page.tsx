import { PrimefieldPolicy } from "@/components/primefield/PrimefieldPolicy";
import { farmPageMetadata, primefield } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/privacy",
  "Website privacy notice",
  "Learn what information Primefield collects through its website enquiries and how to contact the farm about those details.",
);

export default function PrimefieldPrivacyPage() {
  return <PrimefieldPolicy title="Privacy notice" sections={[
    { id: "information-you-share", title: "Information you share", text: "When you contact " + primefield.name + " through this website, we receive your name, email address, phone number and the details you send about your request. The website may use your IP address to limit repeated submissions." },
    { id: "how-we-use-information", title: "How we use it", text: "We use your contact details and message to review and respond to your enquiry. Website and email providers help us host the site, record enquiries and send replies." },
    { id: "external-sites", title: "Links to other sites", text: "The directions link opens an external map service. That service handles information according to its own privacy policy." },
  ]} />;
}
