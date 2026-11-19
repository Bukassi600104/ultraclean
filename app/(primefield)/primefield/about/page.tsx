import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { FarmPhoto, GetDirections, Location, TextLink } from "@/components/primefield/PrimefieldElements";
import { farmImage, farmPageMetadata, farmQuoteLink, primefield } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/about",
  "Our farm in Ibadan",
  "Get to know Primefield Agri-Business Limited in Agbon Ile Village, Ibadan. Explore what we raise and grow and find directions to the farm.",
  farmImage,
);

export default function PrimefieldAboutPage() {
  return (
    <>
      <header className="pf-shell pf-page-intro pf-story-intro">
        <Location />
        <h1>Our farm in Ibadan</h1>
        <p>{primefield.name} is based in Agbon Ile Village. We take enquiries from people buying for their homes, events and businesses.</p>
      </header>
      <div className="pf-shell">
        <FarmPhoto image={farmImage} sizes="(max-width: 720px) 92vw, (max-width: 1390px) 94vw, 1248px" className="pf-story-photo" priority />
      </div>
      <section className="pf-shell pf-section pf-story-list" aria-labelledby="farm-operations">
        <h2 id="farm-operations">What we raise and grow</h2>
        <div>
          <article><h3>Fish farming</h3><p>Ask us about fresh catfish and tell us the weight you need.</p><TextLink href="/products/catfish">Catfish enquiries</TextLink></article>
          <article><h3>Livestock and poultry</h3><p>We take enquiries for <Link href="/products/goats" prefetch={false}>goats</Link> and <Link href="/products/broiler-chickens" prefetch={false}>broiler chickens</Link>. Include the number and date you have in mind.</p></article>
          <article><h3>Seasonal produce</h3><p>Get in touch about the produce you’re looking for. We’ll let you know what’s in season.</p><TextLink href="/products/seasonal-produce">Produce enquiries</TextLink></article>
        </div>
      </section>
      <section className="pf-shell pf-visit" aria-labelledby="visit-title">
        <div>
          <h2 id="visit-title">Find the farm</h2>
          <address>{primefield.address}</address>
          <GetDirections />
        </div>
        <div>
          <h3>Planning a purchase?</h3>
          <p>Tell us what you’re looking for and when you need it.</p>
          <Link className="pf-button" href={farmQuoteLink()} prefetch={false}>Request a quote<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}
