"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { farmProducts, farmQuoteLink } from "@/lib/primefield-site";

export function PrimefieldProductExplorer() {
  const [selected, setSelected] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const product = farmProducts[selected];

  function select(index: number) {
    setInteracted(true);
    setSelected(index);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let next: number;
    const count = farmProducts.length;
    if (event.key === "ArrowRight") next = (selected + 1) % count;
    else if (event.key === "ArrowLeft") next = (selected + count - 1) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    else return;

    event.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className="pf-explorer">
      <div className="pf-explorer-tabs" role="tablist" aria-label="Explore farm products">
        {farmProducts.map(({ slug, name }, index) => (
          <button
            key={slug}
            id={"pf-explorer-tab-" + slug}
            ref={(element) => { tabRefs.current[index] = element; }}
            type="button"
            role="tab"
            tabIndex={selected === index ? 0 : -1}
            aria-controls="pf-explorer-panel"
            aria-selected={selected === index}
            onClick={() => select(index)}
            onKeyDown={onKeyDown}
          >
            {name}
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>
        ))}
      </div>
      <div
        id="pf-explorer-panel"
        role="tabpanel"
        aria-labelledby={"pf-explorer-tab-" + product.slug}
        className="pf-explorer-panel"
      >
        <div key={product.slug} className="pf-explorer-content">
          <figure className="pf-explorer-image">
            <Image
              src={product.image.src}
              alt={product.image.alt}
              width={product.image.width}
              height={product.image.height}
              sizes="(max-width: 720px) 92vw, (max-width: 1390px) 51vw, 690px"
              quality={68}
              loading={interacted ? "eager" : "lazy"}
              fetchPriority={interacted ? "auto" : "low"}
            />
            <figcaption>AI-generated illustration</figcaption>
          </figure>
          <div className="pf-explorer-detail">
            <p className="pf-kicker">{product.category}</p>
            <h3>{product.name}</h3>
            <p>{product.description}</p>
            <div className="pf-explorer-actions">
              <Link className="pf-button" href={farmQuoteLink(product)} prefetch={false}>Request a quote<ArrowUpRight size={17} aria-hidden="true" /></Link>
              <Link className="pf-text-link" href={"/products/" + product.slug} prefetch={false}>
                View {product.name.toLowerCase()}<ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
