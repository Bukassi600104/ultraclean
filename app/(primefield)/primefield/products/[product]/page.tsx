import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { FarmPhoto } from "@/components/primefield/PrimefieldElements";
import { farmPageMetadata, farmProducts, farmQuoteLink, findFarmProduct, primefield } from "@/lib/primefield-site";

type ProductPageProps = { params: { product: string } };

export function generateStaticParams() {
  return farmProducts.map(({ slug }) => ({ product: slug }));
}

export function generateMetadata({ params }: ProductPageProps): Metadata {
  const product = findFarmProduct(params.product);
  if (!product) notFound();

  return farmPageMetadata("/products/" + product.slug, product.seoTitle, product.seoDescription, product.image);
}

export default function PrimefieldProductPage({ params }: ProductPageProps) {
  const product = findFarmProduct(params.product);
  if (!product) notFound();

  return (
    <>
      <section className="pf-shell pf-interior-detail" aria-labelledby="product-title">
        <Link className="pf-back pf-interior-back" href="/products" prefetch={false}>
          <ArrowLeft size={17} aria-hidden="true" />All products
        </Link>
        <div className="pf-interior-detail-layout">
          <div className="pf-interior-detail-copy">
            <p className="pf-kicker">{product.category}<span aria-hidden="true">·</span>{primefield.locality}</p>
            <h1 id="product-title">{product.name}</h1>
            <p>{product.details}</p>
            <div className="pf-interior-detail-actions">
              <Link className="pf-button pf-interior-accent" href={farmQuoteLink(product)} prefetch={false}>
                Request a quote<ArrowUpRight size={17} aria-hidden="true" />
              </Link>
              <a className="pf-simple-link" href={primefield.phoneLink}>Call the farm</a>
            </div>
          </div>
          <FarmPhoto
            image={product.image}
            sizes="(max-width: 720px) calc(100vw - 2rem), (max-width: 1400px) 64vw, 875px"
            className="pf-interior-detail-photo"
            priority
          />
        </div>
      </section>
      <section className="pf-shell pf-interior-related" aria-labelledby="related-title">
        <h2 id="related-title">Explore other products</h2>
        <ul>
          {farmProducts.filter(({ slug }) => slug !== product.slug).map(({ slug, name }) => (
            <li key={slug}>
              <Link href={"/products/" + slug} prefetch={false}>{name}<ArrowUpRight size={18} aria-hidden="true" /></Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
