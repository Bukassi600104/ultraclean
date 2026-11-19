import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { farmQuoteLink, primefield, type FarmImage } from "@/lib/primefield-site";

export function FarmPhoto({
  image, sizes, priority = false, className = "", caption = true,
}: {
  image: FarmImage;
  sizes: string;
  priority?: boolean;
  className?: string;
  caption?: boolean;
}) {
  return (
    <figure className={`pf-photo ${className}`}>
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        sizes={sizes}
        priority={priority}
        quality={priority ? 75 : 67}
        fetchPriority={priority ? "high" : "low"}
      />
      {caption && <figcaption>AI-generated illustration</figcaption>}
    </figure>
  );
}

export function Location() {
  return <p className="pf-location"><MapPin size={16} aria-hidden="true" />{primefield.locality}</p>;
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link className="pf-text-link" href={href} prefetch={false}>{children}<ArrowRight size={17} aria-hidden="true" /></Link>;
}

export function GetDirections() {
  return <a className="pf-text-link" href={primefield.directions}>Get directions<ArrowUpRight size={17} aria-hidden="true" /></a>;
}

export function BulkEnquiry() {
  return (
    <section className="pf-bulk pf-shell" aria-labelledby="bulk-title">
      <div>
        <h2 id="bulk-title">Buying in bulk?</h2>
        <p>Share the products, quantities and date you’re planning for.</p>
      </div>
      <Link className="pf-button" href={farmQuoteLink()} prefetch={false}>Request a quote<ArrowUpRight size={17} aria-hidden="true" /></Link>
    </section>
  );
}

export function PrimefieldFooter() {
  return (
    <footer className="pf-footer">
      <div className="pf-shell">
        <div className="pf-footer-grid">
          <div>
            <Link className="pf-footer-brand" href="/" prefetch={false}>Primefield</Link>
            <p>Agri-Business Limited<br />{primefield.locality}, Nigeria</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/products" prefetch={false}>Products</Link>
            <Link href="/about" prefetch={false}>Our farm</Link>
            <Link href="/contact" prefetch={false}>Contact</Link>
          </nav>
          <div className="pf-footer-contact">
            <a href={primefield.phoneLink}>{primefield.phoneDisplay}</a>
            <a href={primefield.emailLink}>{primefield.email}</a>
          </div>
        </div>
        <div className="pf-footer-legal">
          <small>© {new Date().getFullYear()} {primefield.name}</small>
          <nav aria-label="Policy pages">
            <Link href="/privacy" prefetch={false}>Privacy</Link>
            <Link href="/terms" prefetch={false}>Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
