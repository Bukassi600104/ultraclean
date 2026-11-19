import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { BulkEnquiry, FarmPhoto, Location } from "@/components/primefield/PrimefieldElements";
import { farmPageMetadata, farmProducts } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/products",
  "Catfish, livestock and seasonal produce in Ibadan",
  "Browse Primefield’s catfish, goats, broiler chickens and seasonal produce. Contact the farm in Ibadan for current availability and a quote.",
  farmProducts[0].image,
);

const spreadImageSizes = [
  "(max-width: 720px) calc(100vw - 2rem), (max-width: 1400px) 52vw, 740px",
  "(max-width: 720px) calc(100vw - 2rem), (max-width: 1400px) 29vw, 410px",
  "(max-width: 720px) calc(100vw - 2rem), (max-width: 1400px) 29vw, 410px",
  "(max-width: 720px) calc(100vw - 2rem), (max-width: 1400px) 45vw, 630px",
];

export default function PrimefieldProductsPage() {
  return (
    <>
      <header className="pf-shell pf-interior-intro">
        <div>
          <Location />
          <h1>Farm products</h1>
        </div>
        <p>Choose what you’re looking for, then ask us about availability and price.</p>
      </header>
      <div className="pf-shell">
        <nav className="pf-interior-index" aria-label="Jump to a farm product">
          <ul>
            {farmProducts.map(({ slug, name }) => (
              <li key={slug}>
                <a href={"#" + slug}>{name}<ArrowDown size={15} aria-hidden="true" /></a>
              </li>
            ))}
          </ul>
        </nav>
        <section className="pf-spread" aria-label="Products">
          {farmProducts.map((product, index) => (
            <article className="pf-spread-entry" id={product.slug} key={product.slug} tabIndex={-1}>
              <Link className="pf-spread-link" href={"/products/" + product.slug} prefetch={false} aria-label={"View " + product.name.toLowerCase()}>
                <FarmPhoto
                  image={product.image}
                  sizes={spreadImageSizes[index]}
                  priority={index === 0}
                  className="pf-spread-photo"
                />
                <div className="pf-spread-info">
                  <div>
                    <p className="pf-kicker">{product.category}</p>
                    <h2>{product.name}</h2>
                    <p>{product.description}</p>
                  </div>
                  <span className="pf-interior-arrow"><ArrowUpRight size={23} aria-hidden="true" /></span>
                </div>
              </Link>
            </article>
          ))}
        </section>
      </div>
      <BulkEnquiry />
    </>
  );
}
