import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { FarmPhoto, Location, TextLink } from "@/components/primefield/PrimefieldElements";
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
      <section className="pf-shell pf-product-page">
        <Link className="pf-back" href="/products" prefetch={false}><ArrowLeft size={17} aria-hidden="true" />All products</Link>
        <div className="pf-product-layout">
          <div className="pf-product-copy">
            <Location />
            <h1>{product.name}</h1>
            <p>{product.details}</p>
            <div className="pf-actions">
              <Link className="pf-button" href={farmQuoteLink(product)} prefetch={false}>Request a quote<ArrowUpRight size={17} aria-hidden="true" /></Link>
            </div>
            <a className="pf-simple-link" href={primefield.phoneLink}>Call the farm</a>
          </div>
          <FarmPhoto image={product.image} sizes="(max-width: 720px) 92vw, 55vw" className="pf-detail-photo" priority />
        </div>
      </section>
      <section className="pf-shell pf-section pf-related" aria-labelledby="related-title">
        <h2 id="related-title">Explore other products</h2>
        <ul>
          {farmProducts.filter(({ slug }) => slug !== product.slug).map(({ slug, name }) => (
            <li key={slug}><TextLink href={"/products/" + slug}>{name}</TextLink></li>
          ))}
        </ul>
      </section>
    </>
  );
}
