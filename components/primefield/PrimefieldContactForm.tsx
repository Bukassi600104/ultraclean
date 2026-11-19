"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { farmProducts, findFarmProduct, primefield, type FarmProduct } from "@/lib/primefield-site";

const interests = [
  { value: "buying", label: "Buying farm produce" },
  { value: "partnership", label: "Business partnership" },
  { value: "investment", label: "Investment opportunity" },
  { value: "other", label: "Other enquiry" },
];

export type EnquiryMode = "quote" | "enquiry";

type LeadResponse = {
  success?: boolean;
  preview?: boolean;
  error?: string;
  errors?: Record<string, string[]>;
};

export function PrimefieldContactForm({
  initialMode = "enquiry",
  initialProduct,
  idPrefix = "contact-form",
}: {
  initialMode?: EnquiryMode;
  initialProduct?: FarmProduct["slug"];
  idPrefix?: string;
}) {
  const [mode, setMode] = useState<EnquiryMode>(initialMode);
  const [productSlug, setProductSlug] = useState<string>(initialProduct ?? "");
  const [sending, setSending] = useState(false);
  const [receipt, setReceipt] = useState<{ preview: boolean; productName?: string }>();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState("");
  const pending = useRef(false);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const product = findFarmProduct(productSlug);
  const isQuote = mode === "quote";

  useEffect(() => {
    if (receipt) confirmation.current?.focus();
  }, [receipt]);

  function chooseMode(next: EnquiryMode) {
    if (sending || mode === next) return;
    setMode(next);
    setErrors({});
    setFailure("");
  }

  const fieldId = (field: string) => idPrefix + "-" + field;
  const errorFor = (field: string) => errors[field]?.[0];
  const fieldErrors = (field: string) => ({
    "aria-invalid": errorFor(field) ? true : undefined,
    "aria-describedby": errorFor(field) ? fieldId(field) + "-error" : undefined,
  });
  const showError = (field: string) => errorFor(field) && (
    <span id={fieldId(field) + "-error"} className="pf-field-error">{errorFor(field)}</span>
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    const form = new FormData(event.currentTarget);
    const read = (field: string) => String(form.get(field) ?? "").trim();
    const service = isQuote ? "buying" : read("service");
    const message = read("specialRequests");
    const quantity = Number(read("quantity"));

    if (isQuote && (!product || !Number.isFinite(quantity) || quantity <= 0)) {
      setFailure("Choose a product and enter the quantity you need.");
      return;
    }

    pending.current = true;
    setSending(true);
    setErrors({});
    setFailure("");
    try {
      const response = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: "primefield",
          name: read("name"),
          email: read("email"),
          phone: read("phone"),
          service,
          specialRequests: isQuote && product
            ? ["Product: " + product.name, "Quantity: " + quantity + " " + product.unit, message && "Notes: " + message].filter(Boolean).join("\n")
            : message,
        }),
      });
      const result: LeadResponse = await response.json();
      if (!response.ok || !result.success) {
        if (result.errors) setErrors(result.errors);
        setFailure(result.errors ? "Check the highlighted fields, then try again." : result.error || "We couldn’t send your enquiry. Please try again.");
        return;
      }
      setReceipt({ preview: result.preview === true, productName: isQuote ? product?.name : undefined });
    } catch {
      setFailure("We couldn’t send your enquiry. Please try again or call the farm.");
    } finally {
      pending.current = false;
      setSending(false);
    }
  }

  if (receipt) {
    return (
      <section className="pf-form pf-receipt" aria-labelledby={fieldId("receipt")}>
        <span className="pf-receipt-icon"><Check size={29} aria-hidden="true" /></span>
        <h2 id={fieldId("receipt")} ref={confirmation} tabIndex={-1}>
          {receipt.preview ? "Preview enquiry checked" : receipt.productName ? "Quote request sent" : "Enquiry sent"}
        </h2>
        <p>{receipt.preview
          ? "This form is in preview. The request was validated without saving or sending an email."
          : receipt.productName ? "The farm team will contact you to confirm availability and pricing." : "The farm team will contact you using the details you shared."}</p>
        {receipt.productName && <p className="pf-receipt-summary"><strong>Product</strong> {receipt.productName}</p>}
        <Link className="pf-button" href="/products" prefetch={false}>Back to products<ArrowRight size={17} aria-hidden="true" /></Link>
      </section>
    );
  }

  return (
    <div className="pf-form">
      <div className="pf-form-modes" role="group" aria-label="Choose enquiry type">
        <button type="button" aria-pressed={isQuote} onClick={() => chooseMode("quote")} disabled={sending}>Request a quote</button>
        <button type="button" aria-pressed={!isQuote} onClick={() => chooseMode("enquiry")} disabled={sending}>General enquiry</button>
      </div>
      <form onSubmit={submit} aria-label={isQuote ? "Quote request" : "General enquiry"} aria-busy={sending}>
        {isQuote ? (
          <div className="pf-form-row">
            <div className="pf-field">
              <label htmlFor={fieldId("product")}>Product</label>
              <select id={fieldId("product")} name="product" value={productSlug} onChange={(event) => setProductSlug(event.target.value)} required>
                <option value="">Choose a product</option>
                {farmProducts.map(({ slug, name }) => <option key={slug} value={slug}>{name}</option>)}
              </select>
            </div>
            <div className="pf-field">
              <label htmlFor={fieldId("quantity")}>Quantity</label>
              <div className="pf-quantity-field">
                <input id={fieldId("quantity")} name="quantity" type="number" inputMode={product?.unit === "kg" ? "decimal" : "numeric"}
                  min={product?.unit === "kg" ? "0.01" : "1"} max="999999" step={product?.unit === "kg" ? "any" : "1"}
                  aria-describedby={fieldId("unit")} required />
                <span id={fieldId("unit")}>{product?.unit ?? "Select product"}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pf-field">
            <label htmlFor={fieldId("service")}>Reason</label>
            <select id={fieldId("service")} name="service" defaultValue="" required {...fieldErrors("service")}>
              <option value="" disabled>Choose a reason</option>
              {interests.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            {showError("service")}
          </div>
        )}
        <div className="pf-field">
          <label htmlFor={fieldId("name")}>Full name</label>
          <input id={fieldId("name")} name="name" autoComplete="name" required minLength={2} maxLength={100} {...fieldErrors("name")} />
          {showError("name")}
        </div>
        <div className="pf-form-row">
          <div className="pf-field">
            <label htmlFor={fieldId("email")}>Email</label>
            <input id={fieldId("email")} name="email" type="email" autoComplete="email" required maxLength={254} {...fieldErrors("email")} />
            {showError("email")}
          </div>
          <div className="pf-field">
            <label htmlFor={fieldId("phone")}>Phone</label>
            <input id={fieldId("phone")} name="phone" type="tel" autoComplete="tel" required minLength={10} maxLength={30} {...fieldErrors("phone")} />
            {showError("phone")}
          </div>
        </div>
        <div className="pf-field">
          <label htmlFor={fieldId("specialRequests")}>{isQuote ? "Notes (optional)" : "Message"}</label>
          <textarea id={fieldId("specialRequests")} name="specialRequests" rows={4} maxLength={isQuote ? 1800 : 2000}
            placeholder={isQuote ? "Include a date, other products or any details." : undefined} {...fieldErrors("specialRequests")} />
          {showError("specialRequests")}
        </div>
        <p className="pf-form-note">We use your details to respond. <Link className="pf-simple-link" href="/privacy" prefetch={false}>Privacy notice</Link></p>
        {failure && <p className="pf-submit-error" role="alert">{failure} <a href={primefield.phoneLink}>{primefield.phoneDisplay}</a></p>}
        <button className="pf-button pf-submit" type="submit" disabled={sending}>
          {sending ? "Sending…" : isQuote ? "Send quote request" : "Send enquiry"}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
