import Link from "next/link";
import { TextLink } from "@/components/primefield/PrimefieldElements";

export default function PrimefieldNotFound() {
  return (
    <section className="pf-shell pf-not-found">
      <h1>Page not found</h1>
      <p>The page you’re looking for may have moved.</p>
      <div className="pf-actions">
        <Link className="pf-button" href="/" prefetch={false}>Back to home</Link>
        <TextLink href="/products">Browse products</TextLink>
      </div>
    </section>
  );
}
