import { Mail, MapPin, Phone } from "lucide-react";
import { GetDirections } from "@/components/primefield/PrimefieldElements";
import { PrimefieldContactForm } from "@/components/primefield/PrimefieldContactForm";
import { farmPageMetadata, findFarmProduct, primefield } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/contact",
  "Contact the farm or request a quote",
  "Contact Primefield Agri-Business in Ibadan to request a farm product quote or ask a question. Find the farm phone number, email and directions.",
);

type ContactPageProps = { searchParams: { request?: string | string[]; product?: string | string[] } };

export default function PrimefieldContactPage({ searchParams }: ContactPageProps) {
  const product = findFarmProduct(typeof searchParams.product === "string" ? searchParams.product : undefined);
  const mode = searchParams.request === "quote" || product ? "quote" : "enquiry";
  const methods = (
    <div className="pf-contact-options">
      <div>
        <Phone size={21} aria-hidden="true" />
        <div><h2>Call the farm</h2><a href={primefield.phoneLink}>{primefield.phoneDisplay}</a></div>
      </div>
      <div>
        <Mail size={21} aria-hidden="true" />
        <div><h2>Email us</h2><a href={primefield.emailLink}>{primefield.email}</a></div>
      </div>
      <div>
        <MapPin size={21} aria-hidden="true" />
        <div><h2>Find us</h2><address>{primefield.address}</address><GetDirections /></div>
      </div>
    </div>
  );

  return (
    <section className="pf-shell pf-contact">
      <div className="pf-contact-copy">
        <h1>Get in touch</h1>
        <p>{mode === "quote"
          ? "Tell us what you need. We’ll confirm availability and pricing."
          : "Ask what’s available, request a quote or get in touch about working with Primefield."}</p>
      </div>
      {mode === "enquiry" && methods}
      <PrimefieldContactForm key={mode + (product?.slug ?? "")} initialMode={mode} initialProduct={product?.slug} />
      {mode === "quote" && methods}
    </section>
  );
}
