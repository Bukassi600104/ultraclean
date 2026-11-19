"use client";

import Image from "next/image";
import { useState } from "react";
import type { FarmImage } from "@/lib/primefield-site";

export function PrimefieldScenes({ fields, ponds }: { fields: FarmImage; ponds: FarmImage }) {
  const [selected, setSelected] = useState<"fields" | "ponds">("fields");
  const [loadPonds, setLoadPonds] = useState(false);
  const [pondsReady, setPondsReady] = useState(false);
  const showPonds = selected === "ponds" && pondsReady;

  return (
    <figure className="pf-scenes" aria-label="Illustrated farm scenes">
      <div className="pf-scenes-canvas">
        <Image
          className="pf-scene-image pf-scene-fields"
          src={fields.src}
          alt={showPonds ? "" : fields.alt}
          aria-hidden={showPonds}
          fill
          sizes="100vw"
          priority
          quality={72}
          fetchPriority="high"
        />
        {loadPonds && (
          <Image
            className="pf-scene-image pf-scene-ponds"
            data-visible={showPonds}
            src={ponds.src}
            alt={showPonds ? ponds.alt : ""}
            aria-hidden={!showPonds}
            fill
            sizes="100vw"
            loading="eager"
            quality={72}
            onLoad={() => setPondsReady(true)}
            onError={() => { setSelected("fields"); setLoadPonds(false); }}
          />
        )}
      </div>
      <figcaption className="pf-scene-bar">
        <span>AI-generated illustrations</span>
        <span className="sr-only" role="status">{showPonds ? "Showing the ponds" : "Showing the fields"}</span>
        <div className="pf-scene-controls" role="group" aria-label="Choose a farm scene">
          <button type="button" aria-pressed={selected === "fields"} onClick={() => setSelected("fields")}>Fields</button>
          <button type="button" aria-pressed={selected === "ponds"} onClick={() => { setLoadPonds(true); setSelected("ponds"); }}>Ponds</button>
        </div>
      </figcaption>
    </figure>
  );
}
