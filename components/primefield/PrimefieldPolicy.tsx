import Link from "next/link";
import { primefield } from "@/lib/primefield-site";

export function PrimefieldPolicy({ title, sections }: {
  title: string;
  sections: Array<{ id: string; title: string; text: string }>;
}) {
  return (
    <article className="pf-shell pf-policy">
      <header>
        <nav className="pf-breadcrumb" aria-label="Breadcrumb"><Link href="/" prefetch={false}>Home</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span></nav>
        <h1>{title}</h1>
      </header>
      <div className="pf-policy-layout">
        <nav className="pf-policy-nav" aria-label="On this page">
          <p>On this page</p>
          {sections.map(({ id, title: name }) => <a key={id} href={"#" + id}>{name}</a>)}
          <a href="#policy-contact">Contact</a>
        </nav>
        <div className="pf-policy-body">
          {sections.map(({ id, title: name, text }) => <section key={id} id={id}><h2>{name}</h2><p>{text}</p></section>)}
          <section id="policy-contact">
            <h2>Contact</h2>
            <p>For questions about this page, email <a href={primefield.emailLink}>{primefield.email}</a>.</p>
          </section>
        </div>
      </div>
    </article>
  );
}
