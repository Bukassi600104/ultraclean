import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BulkEnquiry, FarmPhoto, Location } from "@/components/primefield/PrimefieldElements";
import { farmPageMetadata, farmProducts } from "@/lib/primefield-site";

export const metadata = farmPageMetadata(
  "/products",
  "Catfish, livestock and seasonal produce in Ibadan",
  "Browse Primefield’s catfish, goats, broiler chickens and seasonal produce. Contact the farm in Ibadan for current availability and a quote.",
  farmProducts[0].image,
);

export default function PrimefieldProductsPage() {
  return (
    <>
      <header className="pf-shell pf-page-intro pf-catalogue-intro">
        <Location />
        <h1>Farm products</h1>
        <p>Choose what you’re looking for, then ask us about availability and price.</p>
      </header>
      <section className="pf-shell pf-catalogue" aria-label="Products">
        {farmProducts.map((product, index) => (
          <article className="pf-catalogue-row" key={product.slug}>
            <FarmPhoto image={product.image} sizes="(max-width: 720px) 92vw, 52vw" priority={index === 0} />
            <div className="pf-catalogue-copy">
              <p className="pf-kicker">{product.category}</p>
              <h2><Link href={"/products/" + product.slug} prefetch={false}>{product.name}</Link></h2>
              <p>{product.description}</p>
              <Link className="pf-text-link" href={"/products/" + product.slug} prefetch={false} aria-label={"View " + product.name.toLowerCase()}>View product<ArrowUpRight size={18} aria-hidden="true" /></Link>
            </div>
          </article>
        ))}
      </section>
      <BulkEnquiry />
    </>
  );
}
