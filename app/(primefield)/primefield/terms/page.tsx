import { PrimefieldPolicy } from "@/components/primefield/PrimefieldPolicy";
import { farmPageMetadata, primefield } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/terms",
  "Website terms",
  "Read how product information and enquiries work on the Primefield Agri-Business website in Ibadan.",
);

export default function PrimefieldTermsPage() {
  return <PrimefieldPolicy title="Website terms" sections={[
    { id: "using-this-website", title: "Using this website", text: primefield.name + " provides this website to describe its products and help customers contact the farm. Farm scenes and product illustrations are labelled on the site." },
    { id: "product-enquiries", title: "Product enquiries", text: "The form sends an enquiry. The farm confirms price, availability and any collection or delivery arrangements directly before an order is agreed." },
    { id: "your-details", title: "Your details", text: "Please give accurate contact details and tell us what you need so we can respond. Avoid including payment card details or other sensitive information in your message." },
  ]} />;
}
