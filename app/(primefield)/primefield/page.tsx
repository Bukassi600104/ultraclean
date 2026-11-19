import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BulkEnquiry, FarmPhoto, Location, TextLink } from "@/components/primefield/PrimefieldElements";
import { PrimefieldContactForm } from "@/components/primefield/PrimefieldContactForm";
import { PRIMEFIELD_ORIGIN } from "@/lib/primefield-routing";
import { farmImage, farmPageMetadata, farmProducts, farmQuoteLink, heroImage, primefield } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/",
  "Farm produce from Ibadan, Oyo State",
  "Enquire about fresh catfish, goats, broiler chickens and seasonal farm produce from Primefield Agri-Business in Ibadan, Oyo State.",
);

const [catfish, ...otherProducts] = farmProducts;

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
      <section className="pf-home-hero" aria-labelledby="hero-title">
        <div className="pf-shell pf-hero">
          <div className="pf-hero-copy">
            <Location />
            <h1 id="hero-title">Fresh from our farm in Ibadan.</h1>
            <p>Ask us about catfish, goats, broiler chickens and seasonal produce for your home or business.</p>
            <div className="pf-actions">
              <Link className="pf-button" href="/products" prefetch={false}>Explore products<ArrowRight size={18} aria-hidden="true" /></Link>
              <Link className="pf-button pf-button-outline" href={farmQuoteLink()} prefetch={false}>Request a quote</Link>
            </div>
          </div>
          <FarmPhoto image={heroImage} sizes="(max-width: 720px) 92vw, (max-width: 1390px) 51vw, 675px" priority className="pf-hero-photo" />
        </div>
      </section>

      <section id="products" className="pf-shell pf-section" aria-labelledby="products-title">
        <div className="pf-section-heading">
          <h2 id="products-title">From our farm</h2>
          <TextLink href="/products">View all products</TextLink>
        </div>
        <div className="pf-products-feature">
          <Link className="pf-featured-product" href={"/products/" + catfish.slug} prefetch={false}>
            <FarmPhoto image={catfish.image} sizes="(max-width: 720px) 92vw, 53vw" />
            <span className="pf-featured-label">Catfish<ArrowUpRight size={24} aria-hidden="true" /></span>
          </Link>
          <div className="pf-product-index">
            {otherProducts.map((product) => (
              <Link className="pf-product-line" href={"/products/" + product.slug} key={product.slug} prefetch={false}>
                <Image alt="" src={product.image.src} width={96} height={72} sizes="96px" />
                <span><span className="pf-product-line-title">{product.name}</span><span className="pf-product-line-kind">{product.category}</span></span>
                <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
            ))}
            <p className="pf-image-credit">AI-generated product illustrations</p>
          </div>
        </div>
      </section>

      <section id="about" className="pf-farm-band" aria-labelledby="farm-title">
        <div className="pf-shell pf-farm-split">
          <FarmPhoto image={farmImage} sizes="(max-width: 720px) 92vw, 50vw" />
          <div>
            <h2 id="farm-title">Rooted in Ibadan</h2>
            <p>Primefield is based in Agbon Ile Village, Oyo State. Get to know what we raise and grow, and find out how to reach the farm.</p>
            <TextLink href="/about">Explore our farm</TextLink>
          </div>
        </div>
      </section>

      <BulkEnquiry />

      <section className="pf-shell pf-home-contact" aria-labelledby="home-contact-title">
        <div>
          <h2 id="home-contact-title">Get in touch</h2>
          <p>Call <a href={primefield.phoneLink}>{primefield.phoneDisplay}</a> or <a href={primefield.emailLink}>email the farm</a>.</p>
          <TextLink href="/contact">Contact and directions</TextLink>
        </div>
        <details className="pf-home-form">
          <summary>Send an enquiry</summary>
          <div id="contact"><PrimefieldContactForm /></div>
        </details>
      </section>
    </>
  );
}
