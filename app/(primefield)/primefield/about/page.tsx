import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
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
      <header className="pf-interior-farm-hero">
        <div className="pf-shell pf-interior-farm-frame">
          <div className="pf-interior-farm-copy">
            <Location />
            <h1>Our farm in Ibadan</h1>
            <p>{primefield.name} is based in Agbon Ile Village. We take enquiries from people buying for their homes, events and businesses.</p>
            <a className="pf-interior-farm-jump" href="#farm-operations">
              See what we raise and grow<ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
        <FarmPhoto image={farmImage} sizes="100vw" className="pf-interior-farm-photo" priority />
      </header>
      <section className="pf-shell pf-interior-farm-story" aria-labelledby="farm-operations">
        <h2 id="farm-operations">What we raise<br className="pf-interior-break" /> and grow</h2>
        <div className="pf-interior-offerings">
          <article>
            <h3>Fish farming</h3>
            <div>
              <p>Ask us about fresh catfish and tell us the weight you need.</p>
              <TextLink href="/products/catfish">Catfish enquiries</TextLink>
            </div>
          </article>
          <article>
            <h3>Livestock and poultry</h3>
            <div>
              <p>We take enquiries for goats and broiler chickens. Include the number and date you have in mind.</p>
              <div className="pf-interior-offering-links">
                <TextLink href="/products/goats">Goats</TextLink>
                <TextLink href="/products/broiler-chickens">Broiler chickens</TextLink>
              </div>
            </div>
          </article>
          <article>
            <h3>Seasonal produce</h3>
            <div>
              <p>Get in touch about the produce you’re looking for. We’ll let you know what’s in season.</p>
              <TextLink href="/products/seasonal-produce">Produce enquiries</TextLink>
            </div>
          </article>
        </div>
      </section>
      <section className="pf-interior-visit" aria-labelledby="visit-title">
        <div className="pf-shell pf-interior-visit-layout">
          <div className="pf-interior-visit-location">
            <Location />
            <h2 id="visit-title">Find the farm</h2>
            <address>{primefield.address}</address>
            <GetDirections />
          </div>
          <div className="pf-interior-visit-quote">
            <h3>Planning a purchase?</h3>
            <p>Tell us what you’re looking for and when you need it.</p>
            <Link className="pf-button" href={farmQuoteLink()} prefetch={false}>
              Request a quote<ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
