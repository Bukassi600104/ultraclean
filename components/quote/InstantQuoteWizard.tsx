"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Home,
  Building2,
  Sparkles,
  Truck,
  HardHat,
  Star,
  UtensilsCrossed,
  Cross,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Calculator,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { isBefore, startOfDay } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

type ServiceId =
  | "residential"
  | "commercial"
  | "deep-cleaning"
  | "move-in-out"
  | "post-construction"
  | "airbnb"
  | "restaurant-cafe"
  | "clinic-medical";

interface QuoteState {
  service: ServiceId | null;
  // Home-based
  bedrooms: string;
  bathrooms: string;
  frequency: string;
  propertyType: string;
  // Size-based
  sqFootageRange: string;
  spaceType: string;
  // Add-ons
  addOns: string[];
  // Contact
  name: string;
  email: string;
  phone: string;
  preferredDate: Date | undefined;
  notes: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SERVICE_CARDS = [
  { id: "residential" as ServiceId, label: "Residential Cleaning", icon: Home, desc: "Regular home cleaning", from: 150 },
  { id: "commercial" as ServiceId, label: "Commercial Cleaning", icon: Building2, desc: "Offices & retail spaces", from: 200 },
  { id: "deep-cleaning" as ServiceId, label: "Deep Cleaning", icon: Sparkles, desc: "Top-to-bottom thorough clean", from: 250 },
  { id: "move-in-out" as ServiceId, label: "Move-In/Move-Out", icon: Truck, desc: "Smooth transition cleaning", from: 250 },
  { id: "post-construction" as ServiceId, label: "Post-Construction", icon: HardHat, desc: "After reno / new build", from: 350 },
  { id: "airbnb" as ServiceId, label: "Airbnb / Short-Term Rental", icon: Star, desc: "Fast, guest-ready turnovers", from: 150 },
  { id: "restaurant-cafe" as ServiceId, label: "Restaurant & Café", icon: UtensilsCrossed, desc: "Health-code compliant", from: 250 },
  { id: "clinic-medical" as ServiceId, label: "Clinic & Medical Facility", icon: Cross, desc: "IPAC-compliant sanitization", from: 300 },
];

const BEDROOM_PRICES: Record<ServiceId, Record<string, number | "custom">> = {
  residential: { "Studio/1 BR": 150, "2 BR": 200, "3 BR": 265, "4 BR": 330, "5+ BR": 415 },
  "deep-cleaning": { "Studio/1 BR": 250, "2 BR": 325, "3 BR": 410, "4 BR": 500, "5+ BR": 600 },
  "move-in-out": { "Studio/1 BR": 250, "2 BR": 325, "3 BR": 410, "4 BR": 500, "5+ BR": 600 },
  airbnb: { "Studio/1 BR": 150, "2 BR": 200, "3 BR": 260, "4+ BR": 320 },
  commercial: {},
  "post-construction": {},
  "restaurant-cafe": {},
  "clinic-medical": {},
};

const SQFT_PRICES: Partial<Record<ServiceId, Record<string, number | "custom">>> = {
  "post-construction": {
    "Under 1,000 sq ft": 350,
    "1,000 – 2,000 sq ft": 500,
    "2,000 – 3,000 sq ft": 650,
    "3,000+ sq ft": "custom",
  },
  commercial: {
    "Under 1,000 sq ft": 200,
    "1,000 – 2,500 sq ft": 350,
    "2,500 – 5,000 sq ft": 550,
    "5,000+ sq ft": "custom",
  },
  "restaurant-cafe": {
    "Under 1,000 sq ft": 250,
    "1,000 – 2,500 sq ft": 400,
    "2,500+ sq ft": "custom",
  },
  "clinic-medical": {
    "Under 1,000 sq ft": 300,
    "1,000 – 2,500 sq ft": 480,
    "2,500+ sq ft": "custom",
  },
};

const BATHROOM_EXTRA: Record<string, number> = {
  residential: 30,
  "deep-cleaning": 50,
  "move-in-out": 50,
};

const FREQUENCY_DISCOUNTS: Record<string, number> = {
  "One-time": 0,
  Monthly: 0.05,
  "Bi-weekly": 0.1,
  Weekly: 0.15,
};

const ADD_ONS = [
  { id: "oven", label: "Inside Oven", price: 30 },
  { id: "fridge", label: "Inside Refrigerator", price: 25 },
  { id: "windows", label: "Interior Windows", price: 40 },
  { id: "laundry", label: "Laundry (Wash & Fold)", price: 30 },
  { id: "basement", label: "Basement", price: 50 },
  { id: "garage", label: "Garage", price: 40 },
  { id: "walls", label: "Wall Washing", price: 35 },
];

// Services that use bedroom/bathroom selector
const HOME_BASED: ServiceId[] = ["residential", "deep-cleaning", "move-in-out", "airbnb"];
// Services that use sq footage selector
const SQFT_BASED: ServiceId[] = ["post-construction", "commercial", "restaurant-cafe", "clinic-medical"];
// Services that show add-ons step
const HAS_ADDONS: ServiceId[] = ["residential", "deep-cleaning", "move-in-out"];

// ── Price Calculator ───────────────────────────────────────────────────────

function calculateQuote(state: QuoteState): number | "custom" | null {
  const svc = state.service;
  if (!svc) return null;

  // Home-based (bedroom/bathroom pricing)
  if (HOME_BASED.includes(svc)) {
    if (!state.bedrooms) return null;
    const bedroomPrice = BEDROOM_PRICES[svc][state.bedrooms];
    if (bedroomPrice === undefined) return null;
    if (bedroomPrice === "custom") return "custom";

    let total = bedroomPrice as number;

    // Bathroom extra (for residential, deep, move-in-out)
    const extraPerBath = BATHROOM_EXTRA[svc] ?? 0;
    if (state.bathrooms && state.bathrooms !== "1" && extraPerBath > 0) {
      const extraBaths =
        state.bathrooms === "1.5"
          ? 0.5
          : state.bathrooms === "2"
          ? 1
          : state.bathrooms === "2.5"
          ? 1.5
          : state.bathrooms === "3"
          ? 2
          : state.bathrooms === "3+"
          ? 2.5
          : 0;
      total += Math.round(extraBaths * extraPerBath);
    }

    // Frequency discount (residential only)
    if (svc === "residential" && state.frequency) {
      const discount = FREQUENCY_DISCOUNTS[state.frequency] ?? 0;
      total = Math.round(total * (1 - discount));
    }

    // Add-ons
    for (const addon of state.addOns) {
      const found = ADD_ONS.find((a) => a.id === addon);
      if (found) total += found.price;
    }

    return total;
  }

  // Sq footage based
  if (SQFT_BASED.includes(svc)) {
    if (!state.sqFootageRange) return null;
    const prices = SQFT_PRICES[svc];
    if (!prices) return null;
    const price = prices[state.sqFootageRange];
    if (price === undefined) return null;
    return price;
  }

  return null;
}

function getStepCount(service: ServiceId | null): number {
  if (!service) return 4;
  return HAS_ADDONS.includes(service) ? 4 : 3;
}

// ── Main Component ─────────────────────────────────────────────────────────

export function InstantQuoteWizard() {
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<number | "custom" | null>(null);

  const [state, setState] = useState<QuoteState>({
    service: null,
    bedrooms: "",
    bathrooms: "1",
    frequency: "One-time",
    propertyType: "House",
    sqFootageRange: "",
    spaceType: "Office",
    addOns: [],
    name: "",
    email: "",
    phone: "",
    preferredDate: undefined,
    notes: "",
  });

  // Pre-select service from URL param
  useEffect(() => {
    const svc = searchParams.get("service") as ServiceId | null;
    if (svc && SERVICE_CARDS.find((s) => s.id === svc)) {
      setState((prev) => ({ ...prev, service: svc }));
      setStep(2);
    }
  }, [searchParams]);

  const quote = calculateQuote(state);
  const totalSteps = getStepCount(state.service);

  const update = (field: keyof QuoteState, value: QuoteState[keyof QuoteState]) =>
    setState((prev) => ({ ...prev, [field]: value }));

  const toggleAddOn = (id: string) => {
    setState((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(id)
        ? prev.addOns.filter((a) => a !== id)
        : [...prev.addOns, id],
    }));
  };

  const nextStep = () => {
    // Skip add-ons step if service doesn't have them
    if (step === 2 && state.service && !HAS_ADDONS.includes(state.service)) {
      setStep(4);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps));
    }
  };

  const prevStep = () => {
    // Skip back over add-ons step if service doesn't have them
    if (step === 4 && state.service && !HAS_ADDONS.includes(state.service)) {
      setStep(2);
    } else {
      setStep((s) => Math.max(s - 1, 1));
    }
  };

  const canProceed = (): boolean => {
    if (step === 1) return !!state.service;
    if (step === 2) {
      if (!state.service) return false;
      if (HOME_BASED.includes(state.service)) return !!state.bedrooms;
      if (SQFT_BASED.includes(state.service)) return !!state.sqFootageRange;
      return true;
    }
    if (step === 3) return true; // add-ons are optional
    if (step === 4) {
      return (
        state.name.trim().length >= 2 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) &&
        state.phone.trim().length >= 10
      );
    }
    return true;
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      const addOnText =
        state.addOns.length > 0
          ? `Add-ons: ${state.addOns
              .map((id) => ADD_ONS.find((a) => a.id === id)?.label)
              .filter(Boolean)
              .join(", ")}`
          : "";

      const quoteText =
        quote === "custom"
          ? "Estimated price: Custom quote required"
          : quote
          ? `Estimated price: $${quote} CAD`
          : "";

      const notesArr = [addOnText, quoteText, state.notes].filter(Boolean);

      const payload = {
        name: state.name,
        email: state.email,
        phone: state.phone,
        service: state.service ?? "",
        propertyType: state.propertyType || undefined,
        squareFootage: state.sqFootageRange || state.bedrooms || undefined,
        dateNeeded: state.preferredDate
          ? format(state.preferredDate, "yyyy-MM-dd")
          : undefined,
        frequency: state.frequency !== "One-time" ? state.frequency : undefined,
        specialRequests: notesArr.join(" | ") || undefined,
        referralSource: "instant-quote",
      };

      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }

      setSubmittedQuote(quote);
      setIsSuccess(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success Screen ─────────────────────────────────────────────────────

  if (isSuccess) {
    return (
      <div className="text-center py-10 px-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-heading font-extrabold mb-3">
          Your Quote is Ready!
        </h2>
        {submittedQuote === "custom" ? (
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Your job requires a custom assessment. We&apos;ll review your details and send you a
            personalized quote within <strong>2 business hours</strong>.
          </p>
        ) : submittedQuote ? (
          <div className="mb-6">
            <div className="inline-block bg-primary/10 rounded-2xl px-8 py-5 mb-4">
              <p className="text-sm text-muted-foreground mb-1">Your estimated price</p>
              <p className="text-5xl font-heading font-extrabold text-primary">${submittedQuote}</p>
              <p className="text-xs text-muted-foreground mt-1">CAD · starting rate</p>
            </div>
            <p className="text-muted-foreground max-w-md mx-auto">
              We&apos;ll send a confirmation to <strong>{state.email}</strong> and reach out to
              confirm the final quote and schedule your service.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Thanks! We&apos;ll be in touch shortly with your personalized quote.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          <Button
            asChild
            className="rounded-full px-8 h-12"
          >
            <a href="/">Back to Home</a>
          </Button>
          <Button
            variant="outline"
            className="rounded-full px-8 h-12"
            onClick={() => {
              setIsSuccess(false);
              setStep(1);
              setState({
                service: null,
                bedrooms: "",
                bathrooms: "1",
                frequency: "One-time",
                propertyType: "House",
                sqFootageRange: "",
                spaceType: "Office",
                addOns: [],
                name: "",
                email: "",
                phone: "",
                preferredDate: undefined,
                notes: "",
              });
            }}
          >
            Get Another Quote
          </Button>
        </div>
      </div>
    );
  }

  // ── Progress Bar ───────────────────────────────────────────────────────

  const stepLabels =
    state.service && HAS_ADDONS.includes(state.service)
      ? ["Service", "Property", "Add-Ons", "Your Details"]
      : ["Service", "Details", "Your Details"];

  const displayStep =
    step === 4 && state.service && !HAS_ADDONS.includes(state.service) ? 3 : step;

  return (
    <div className="space-y-8">
      {/* Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-primary">
            Step {displayStep} of {totalSteps}
          </span>
          <span className="text-muted-foreground">{stepLabels[displayStep - 1]}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${(displayStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className={`text-xs font-medium transition-colors ${
                i + 1 <= displayStep ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Live Price Display (step 2+) */}
      {step > 1 && quote !== null && (
        <div
          className={`flex items-center gap-3 rounded-2xl px-5 py-3 ${
            quote === "custom"
              ? "bg-amber-50 border border-amber-200"
              : "bg-primary/10 border border-primary/20"
          }`}
        >
          <Calculator className={`h-5 w-5 shrink-0 ${quote === "custom" ? "text-amber-600" : "text-primary"}`} />
          <div>
            <p className={`text-xs font-medium ${quote === "custom" ? "text-amber-700" : "text-primary/70"}`}>
              Estimated Starting Price
            </p>
            <p className={`font-heading font-extrabold text-lg leading-tight ${quote === "custom" ? "text-amber-800" : "text-primary"}`}>
              {quote === "custom" ? "Custom Quote Required" : `$${quote} CAD`}
            </p>
          </div>
          {quote !== "custom" && (
            <p className="text-xs text-muted-foreground ml-auto hidden sm:block">
              Final price confirmed before booking
            </p>
          )}
        </div>
      )}

      {/* ── Step 1: Service Selection ─────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-heading font-bold">What service do you need?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICE_CARDS.map(({ id, label, icon: Icon, desc, from }) => (
              <button
                key={id}
                type="button"
                onClick={() => update("service", id)}
                className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  state.service === id
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    state.service === id ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className={`font-semibold text-sm leading-snug ${state.service === id ? "text-primary" : ""}`}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  <p className="text-xs font-bold text-primary/80 mt-1">From ${from}</p>
                </div>
                {state.service === id && (
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 ml-auto mt-0.5" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: Property Details ──────────────────────────────────────── */}
      {step === 2 && state.service && (
        <div className="space-y-6">
          <h2 className="text-xl font-heading font-bold">Tell us about your property</h2>

          {/* Home-based services */}
          {HOME_BASED.includes(state.service) && (
            <>
              {/* Property type (not for Airbnb) */}
              {state.service !== "airbnb" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Property Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {["House", "Condo", "Apartment", "Townhouse"].map((pt) => (
                      <OptionChip
                        key={pt}
                        label={pt}
                        selected={state.propertyType === pt}
                        onClick={() => update("propertyType", pt)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Bedrooms */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  {state.service === "airbnb" ? "Number of Bedrooms / Units" : "Bedrooms"}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(BEDROOM_PRICES[state.service]).map((br) => (
                    <OptionChip
                      key={br}
                      label={br}
                      selected={state.bedrooms === br}
                      onClick={() => update("bedrooms", br)}
                    />
                  ))}
                </div>
              </div>

              {/* Bathrooms (not for Airbnb) */}
              {state.service !== "airbnb" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Bathrooms</Label>
                  <div className="flex flex-wrap gap-2">
                    {["1", "1.5", "2", "2.5", "3", "3+"].map((bth) => (
                      <OptionChip
                        key={bth}
                        label={bth}
                        selected={state.bathrooms === bth}
                        onClick={() => update("bathrooms", bth)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Frequency (residential only) */}
              {state.service === "residential" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Cleaning Frequency
                    <span className="ml-2 text-xs font-normal text-primary">(recurring = save up to 15%)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(FREQUENCY_DISCOUNTS).map(([label, discount]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => update("frequency", label)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                          state.frequency === label
                            ? "border-primary bg-primary text-white"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        {label}
                        {discount > 0 && (
                          <span
                            className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                              state.frequency === label
                                ? "bg-white/20 text-white"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            -{Math.round(discount * 100)}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sq footage based services */}
          {SQFT_BASED.includes(state.service) && (
            <>
              {/* Space type (commercial only) */}
              {state.service === "commercial" && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Space Type</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Office", "Retail", "Warehouse", "Other"].map((st) => (
                      <OptionChip
                        key={st}
                        label={st}
                        selected={state.spaceType === st}
                        onClick={() => update("spaceType", st)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Sq footage */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Approximate Size</Label>
                <div className="flex flex-col gap-2">
                  {Object.entries(SQFT_PRICES[state.service] ?? {}).map(([range, price]) => (
                    <button
                      key={range}
                      type="button"
                      onClick={() => update("sqFootageRange", range)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        state.sqFootageRange === range
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <span>{range}</span>
                      <span className={`font-bold ${state.sqFootageRange === range ? "text-primary" : "text-muted-foreground"}`}>
                        {price === "custom" ? "Custom Quote" : `$${price}+`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Add-Ons ───────────────────────────────────────────────── */}
      {step === 3 && state.service && HAS_ADDONS.includes(state.service) && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-heading font-bold">Any add-ons?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Optional extras — select all that apply
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADD_ONS.map(({ id, label, price }) => {
              const selected = state.addOns.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleAddOn(id)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-xl border-2 text-sm text-left transition-all duration-200 ${
                    selected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selected ? "bg-primary border-primary" : "border-muted-foreground/40"
                      }`}
                    >
                      {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                    <span className="font-medium">{label}</span>
                  </div>
                  <span className={`font-bold ${selected ? "text-primary" : "text-muted-foreground"}`}>
                    +${price}
                  </span>
                </button>
              );
            })}
          </div>
          {state.addOns.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No add-ons selected — you can skip this step
            </p>
          )}
        </div>
      )}

      {/* ── Step 4: Contact Details ───────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-heading font-bold">Your contact details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We&apos;ll confirm your quote and reach out to schedule
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qt-name">Full Name *</Label>
              <Input
                id="qt-name"
                placeholder="Jane Doe"
                value={state.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qt-phone">Phone Number *</Label>
              <Input
                id="qt-phone"
                type="tel"
                placeholder="+1 (647) 000-0000"
                value={state.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qt-email">Email Address *</Label>
            <Input
              id="qt-email"
              type="email"
              placeholder="jane@example.com"
              value={state.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Preferred Service Date (optional)</Label>
            <Card className="border shadow-sm">
              <CardContent className="p-2 flex justify-center">
                <Calendar
                  mode="single"
                  selected={state.preferredDate}
                  onSelect={(date) => update("preferredDate", date)}
                  disabled={(date) =>
                    isBefore(startOfDay(date), startOfDay(new Date()))
                  }
                />
              </CardContent>
            </Card>
            {state.preferredDate && (
              <p className="text-sm text-primary font-medium">
                Selected: {format(state.preferredDate, "EEEE, MMMM d, yyyy")}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qt-notes">Anything else we should know? (optional)</Label>
            <Textarea
              id="qt-notes"
              rows={3}
              placeholder="Special instructions, access codes, pet info, etc."
              value={state.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>

          {/* Quote summary before submit */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-heading font-bold text-sm">Quote Summary</h3>
              <div className="space-y-1.5 text-sm">
                <SummaryRow
                  label="Service"
                  value={SERVICE_CARDS.find((s) => s.id === state.service)?.label ?? ""}
                />
                {state.bedrooms && (
                  <SummaryRow label="Size" value={`${state.bedrooms}${state.bathrooms && state.bathrooms !== "1" ? ` / ${state.bathrooms} bath` : ""}`} />
                )}
                {state.sqFootageRange && (
                  <SummaryRow label="Size" value={state.sqFootageRange} />
                )}
                {state.service === "residential" && state.frequency !== "One-time" && (
                  <SummaryRow label="Frequency" value={state.frequency} highlight />
                )}
                {state.addOns.length > 0 && (
                  <SummaryRow
                    label="Add-ons"
                    value={state.addOns.map((id) => ADD_ONS.find((a) => a.id === id)?.label).join(", ")}
                  />
                )}
              </div>
              <div className="border-t border-primary/20 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Estimated Price</span>
                <span className="text-xl font-heading font-extrabold text-primary">
                  {quote === "custom" ? "Custom Quote" : quote ? `$${quote} CAD` : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Starting rate. Final price confirmed before any work begins.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={prevStep}
          disabled={step === 1}
          className="gap-2 rounded-full"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {step < 4 ? (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!canProceed()}
            className="gap-2 rounded-full px-8 h-11"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || !canProceed()}
            className="gap-2 rounded-full px-8 h-11 shadow-lg shadow-primary/25"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Get My Quote
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Helper Components ──────────────────────────────────────────────────────

function OptionChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 ${
        selected
          ? "border-primary bg-primary text-white shadow-sm"
          : "border-border/60 hover:border-primary/40 hover:bg-muted/40"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium text-right ${highlight ? "text-green-700" : ""}`}>{value}</span>
    </div>
  );
}
