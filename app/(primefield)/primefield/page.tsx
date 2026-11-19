import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { FarmPhoto, Location, TextLink } from "@/components/primefield/PrimefieldElements";
import { PrimefieldContactForm } from "@/components/primefield/PrimefieldContactForm";
import { PrimefieldProductExplorer } from "@/components/primefield/PrimefieldProductExplorer";
import { PrimefieldScenes } from "@/components/primefield/PrimefieldScenes";
import { PRIMEFIELD_ORIGIN } from "@/lib/primefield-routing";
import { farmImage, farmPageMetadata, farmQuoteLink, heroImage, pondImage, primefield } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/",
  "Farm produce from Ibadan, Oyo State",
  "Enquire about fresh catfish, goats, broiler chickens and seasonal farm produce from Primefield Agri-Business in Ibadan, Oyo State.",
);

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: primefield.name,
  url: PRIMEFIELD_ORIGIN,
  logo: PRIMEFIELD_ORIGIN + "/primefield/logo.webp",
  email: primefield.email,
  telephone: primefield.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: "Agbon Ile Village, Makoni Hotels Bus Stop, Ido Eleyele-Ologuneru Road",
    addressLocality: "Ibadan",
    addressRegion: "Oyo State",
    addressCountry: "NG",
  },
};

export default function PrimefieldHomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization).replace(/</g, "\\u003c") }} />
      <section className="pf-cinema" aria-labelledby="hero-title">
        <div className="pf-shell pf-cinema-inner">
          <div className="pf-cinema-copy">
            <Location />
            <h1 id="hero-title">Fresh from our farm <em>in Ibadan.</em></h1>
            <p>Catfish, goats, broiler chickens and seasonal produce for homes, events and businesses.</p>
            <div className="pf-actions">
              <a className="pf-button pf-button-gold" href="#products">Explore products<ArrowDown size={17} aria-hidden="true" /></a>
              <Link className="pf-button pf-button-light-outline" href={farmQuoteLink()} prefetch={false}>Request a quote<ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
          </div>
        </div>
        <PrimefieldScenes fields={heroImage} ponds={pondImage} />
      </section>

      <section id="products" className="pf-shell pf-explore-section" aria-labelledby="products-title">
        <div className="pf-editorial-heading">
          <div>
            <h2 id="products-title">From our farm</h2>
            <p>Pick a product to see what to ask for and start your quote.</p>
          </div>
          <TextLink href="/products">See the full catalogue</TextLink>
        </div>
        <PrimefieldProductExplorer />
      </section>

      <section id="about" className="pf-field-story" aria-labelledby="farm-title">
        <div className="pf-shell pf-field-story-inner">
          <FarmPhoto image={farmImage} sizes="(max-width: 720px) 92vw, (max-width: 1400px) 70vw, 950px" className="pf-field-story-picture" />
          <div className="pf-field-story-copy">
            <Location />
            <h2 id="farm-title">Rooted in Ibadan</h2>
            <p>Primefield is based in Agbon Ile Village, Oyo State. Get to know what we raise and grow, and find out how to reach the farm.</p>
            <TextLink href="/about">Explore our farm</TextLink>
          </div>
        </div>
      </section>

      <section className="pf-shell pf-home-purchase" aria-labelledby="home-contact-title">
        <div className="pf-home-purchase-intro">
          <h2 id="home-contact-title">Buying in bulk?</h2>
          <p>Tell us what you need, how much and when. We’ll confirm availability and pricing.</p>
          <Link className="pf-button" href={farmQuoteLink()} prefetch={false}>Request a bulk quote<ArrowUpRight size={17} aria-hidden="true" /></Link>
        </div>
        <div className="pf-home-purchase-contact">
          <h3>Get in touch</h3>
          <p>Call <a href={primefield.phoneLink}>{primefield.phoneDisplay}</a> or <a href={primefield.emailLink}>email the farm</a>.</p>
          <TextLink href="/contact">Contact and directions</TextLink>
          <details className="pf-home-form">
            <summary>Send an enquiry</summary>
            <div id="contact"><PrimefieldContactForm /></div>
          </details>
        </div>
      </section>
    </>
  );
}
