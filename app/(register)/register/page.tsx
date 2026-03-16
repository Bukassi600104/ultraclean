import type { Metadata } from "next";
import { BOLogo } from "@/components/register/BOLogo";
import {
  Calendar,
  Clock,
  Monitor,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Shield,
  RefreshCw,
  DollarSign,
  Building2,
  Bot,
  ChevronRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Digital Income Systems to Capital Blueprint — Bimbo Oyedotun",
  description:
    "Join Bimbo Oyedotun on March 28th, 2026 for a live mentorship session on building digital income systems and reinvesting them into a real, funded business. Only $20.",
  openGraph: {
    title: "Digital Income Systems to Capital Blueprint",
    description:
      "Live mentorship by Bimbo Oyedotun — March 28, 2026 | 12PM EST | $20",
    type: "website",
  },
};

const curriculum = [
  {
    icon: DollarSign,
    number: "01",
    title: "Generate Digital Income",
    body: "Freelancing, content monetization, digital products, affiliate marketing, e-commerce, Micro-SaaS — scalable streams with low overhead.",
  },
  {
    icon: Building2,
    number: "02",
    title: "Separate Business & Personal Money",
    body: "Open a business account, set a fixed reinvestment rate, and stop lifestyle inflation from killing your capital before it compounds.",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Reinvest Strategically",
    body: "Fund tools, marketing, outsourcing and product upgrades — highest ROI first. If it doesn't increase sales or capacity, it doesn't get funded.",
  },
  {
    icon: RefreshCw,
    number: "04",
    title: "Compound the Business Loop",
    body: "Digital income → cash → assets → revenue → bigger growth. This is bootstrapping with velocity, not luck.",
  },
  {
    icon: Shield,
    number: "05",
    title: "De-Risk With Digital Income",
    body: "Cover fixed costs, build 6–12 months of runway, and reduce reliance on loans or investors. Smart founders use digital income as insurance.",
  },
  {
    icon: Bot,
    number: "06",
    title: "AI Skills Training",
    body: "Special guest Tony Orjiako shows you exactly how to use AI to develop your digital skills faster — a full 1-hour dedicated session.",
  },
];

const roadmap = [
  {
    phase: "Phase 1",
    days: "Days 1–30",
    title: "Cash Foundation",
    goal: "Predictable income",
    actions: [
      "Pick one income stream",
      "Define one clear offer",
      "Close first paying customers",
      "Open separate business account",
    ],
    target: "$1,000–$3,000/month baseline",
    color: "#160C5A",
  },
  {
    phase: "Phase 2",
    days: "Days 31–60",
    title: "Reinvestment & Systems",
    goal: "Buy back time and increase capacity",
    actions: [
      "Reinvest first profits into tools",
      "Build automation & repeatable process",
      "Document delivery steps",
      "Increase pricing OR volume (not both)",
    ],
    target: "Consistent leads + less manual effort",
    color: "#1e1575",
  },
  {
    phase: "Phase 3",
    days: "Days 61–90",
    title: "Scale or Productize",
    goal: "Turn income into an asset",
    actions: [
      "Identify what clients ask for repeatedly",
      "Turn it into a template, retainer, or course",
      "Test upsell or second offer",
      "Build 3–6 months of runway",
    ],
    target: "$3,000–$10,000/month with leverage",
    color: "#2a1d9e",
  },
];

export default function RegisterPage() {
  return (
    <div className="font-sans antialiased">

      {/* ── NAVBAR ───────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 shadow-md"
        style={{ backgroundColor: "#160C5A" }}
      >
        <div className="flex items-center gap-3">
          <BOLogo size={32} color="#ffffff" />
          <span className="text-white font-bold text-sm tracking-wide hidden sm:block">
            Bimbo Oyedotun
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm hidden md:block">
            March 28, 2026 · 12PM EST
          </span>
          <a
            href="/form"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
          >
            Register — $20
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 md:py-28 px-6"
        style={{ backgroundColor: "#160C5A" }}
      >
        {/* Dot-grid background pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        {/* Large decorative O */}
        <div
          className="absolute -right-24 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5 border-[40px]"
          style={{ borderColor: "#ffffff" }}
        />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — text */}
            <div>
              {/* Pre-headline badge */}
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 text-xs font-bold tracking-widest uppercase"
                style={{ backgroundColor: "#F5C842", color: "#160C5A" }}>
                Live Mentorship Event · March 28, 2026
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-none tracking-tight uppercase mb-6">
                Digital Income
                <span style={{ color: "#F5C842" }}> Systems</span>
                <br />to Capital
                <br />Blueprint
              </h1>

              <p className="text-white/75 text-lg leading-relaxed mb-8 max-w-xl">
                The live session that shows you how to generate digital income
                and reinvest it into a real, funded business — systematically.
                One system. 90 days. Real results.
              </p>

              {/* Event details row */}
              <div className="flex flex-wrap gap-4 mb-10">
                {[
                  { icon: Calendar, text: "March 28th, 2026" },
                  { icon: Clock, text: "12PM EST" },
                  { icon: Monitor, text: "Live Online" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                  >
                    <Icon className="h-4 w-4" style={{ color: "#F5C842" }} />
                    {text}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap gap-4">
                <a
                  href="/form"
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-extrabold text-base transition-opacity hover:opacity-90 shadow-lg"
                  style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
                >
                  Register Now — $20
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#curriculum"
                  className="inline-flex items-center gap-2 rounded-full px-8 py-4 font-semibold text-base border-2 text-white transition-colors hover:bg-white/10"
                  style={{ borderColor: "rgba(255,255,255,0.4)" }}
                >
                  See Full Curriculum
                  <ChevronRight className="h-4 w-4" />
                </a>
              </div>
            </div>

            {/* Right — profile card */}
            <div className="flex flex-col items-center lg:items-end gap-6">
              {/* Main profile */}
              <div
                className="relative rounded-3xl p-6 w-full max-w-sm text-center"
                style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                {/* Price badge */}
                <div
                  className="absolute -top-4 -right-4 w-16 h-16 rounded-full flex items-center justify-center font-extrabold text-lg shadow-xl"
                  style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
                >
                  $20
                </div>

                {/* Photo placeholder */}
                <div
                  className="w-32 h-32 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl font-extrabold text-white ring-4"
                  style={{
                    background: "linear-gradient(135deg, #2a1d9e, #160C5A)",
                    boxShadow: "0 0 0 4px #F5C842",
                  }}
                >
                  BO
                </div>

                <h3 className="text-white font-extrabold text-xl tracking-wide">
                  BIMBO OYEDOTUN
                </h3>
                <p style={{ color: "#F5C842" }} className="text-sm font-semibold mt-1">
                  Wealth Systems Architect
                </p>
                <p className="text-white/50 text-xs mt-3 leading-relaxed">
                  Financial strategist & entrepreneur helping people build
                  digital income systems that fund real businesses.
                </p>
              </div>

              {/* Special guest card */}
              <div
                className="rounded-2xl px-5 py-4 w-full max-w-sm flex items-center gap-4"
                style={{ backgroundColor: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.3)" }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
                >
                  AI
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Special Guest: Tony Orjiako</p>
                  <p className="text-white/60 text-xs mt-0.5">
                    How to use AI to develop your digital skills faster
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ───────────────────────────── */}
      <div
        className="py-4 px-6 flex flex-wrap items-center justify-center gap-8 text-sm font-semibold"
        style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
      >
        {[
          "✓ Live Q&A Included",
          "✓ 3+ Hours of Mentorship",
          "✓ AI Training Session",
          "✓ 90-Day Action Plan",
          "✓ Reinvestment Framework",
        ].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>

      {/* ── CURRICULUM ───────────────────────────────────── */}
      <section id="curriculum" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: "#F5C842" }}
            >
              Full Curriculum
            </p>
            <h2
              className="text-4xl font-extrabold tracking-tight"
              style={{ color: "#160C5A" }}
            >
              A Complete System. Not Just Theory.
            </h2>
            <p className="text-gray-500 mt-3 text-lg max-w-2xl mx-auto">
              Walk away with a real, executable plan — not motivation that fades by Monday.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {curriculum.map((item) => (
              <div
                key={item.number}
                className="group rounded-2xl p-6 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ borderColor: "#e5e7eb" }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: "#160C5A" }}
                  >
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <span
                    className="text-3xl font-black opacity-10 leading-none mt-1"
                    style={{ color: "#160C5A" }}
                  >
                    {item.number}
                  </span>
                </div>
                <h3
                  className="font-extrabold text-lg mb-2"
                  style={{ color: "#160C5A" }}
                >
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 90-DAY ROADMAP ───────────────────────────────── */}
      <section
        id="roadmap"
        className="py-20 px-6"
        style={{ backgroundColor: "#f8f7ff" }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: "#F5C842", WebkitTextStroke: "0.5px #b38e00" }}
            >
              The Blueprint
            </p>
            <h2
              className="text-4xl font-extrabold tracking-tight"
              style={{ color: "#160C5A" }}
            >
              Your 90-Day Funding Roadmap
            </h2>
            <p className="text-gray-500 mt-3 text-lg">
              Three clear phases. One momentum-building system.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector line (desktop) */}
            <div
              className="hidden md:block absolute top-12 left-[calc(33.333%+12px)] right-[calc(33.333%+12px)] h-0.5 z-0"
              style={{ backgroundColor: "#160C5A", opacity: 0.15 }}
            />

            {roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="relative rounded-2xl p-7 shadow-lg z-10"
                style={{ backgroundColor: "#160C5A" }}
              >
                {/* Phase badge */}
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold mb-4"
                  style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
                >
                  {phase.phase} · {phase.days}
                </div>

                <h3 className="text-white font-extrabold text-xl mb-1">
                  {phase.title}
                </h3>
                <p className="text-white/50 text-sm mb-5 italic">
                  Goal: {phase.goal}
                </p>

                <ul className="space-y-2 mb-6">
                  {phase.actions.map((a) => (
                    <li key={a} className="flex items-start gap-2 text-white/80 text-sm">
                      <CheckCircle2
                        className="h-4 w-4 mt-0.5 shrink-0"
                        style={{ color: "#F5C842" }}
                      />
                      {a}
                    </li>
                  ))}
                </ul>

                <div
                  className="rounded-xl px-4 py-3 text-sm font-bold text-center"
                  style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
                >
                  Target: {phase.target}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MONEY FORMULA ────────────────────────────────── */}
      <section
        className="py-20 px-6"
        style={{ backgroundColor: "#160C5A" }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: "#F5C842" }}
          >
            The Framework
          </p>
          <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
            The Split That Changes Everything
          </h2>
          <p className="text-white/60 text-lg mb-14">
            Use this baseline every month until revenue grows.
          </p>

          <div className="grid grid-cols-3 gap-6 mb-10">
            {[
              { pct: "50%", label: "Reinvestment", sub: "Business Growth" },
              { pct: "30%", label: "Personal Pay", sub: "Stability" },
              { pct: "20%", label: "Buffer", sub: "Taxes + Runway" },
            ].map((item) => (
              <div
                key={item.pct}
                className="rounded-2xl p-6 flex flex-col items-center"
                style={{ backgroundColor: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <span
                  className="text-5xl font-black mb-2"
                  style={{ color: "#F5C842" }}
                >
                  {item.pct}
                </span>
                <span className="text-white font-bold text-base">{item.label}</span>
                <span className="text-white/50 text-sm mt-1">{item.sub}</span>
              </div>
            ))}
          </div>

          <div
            className="inline-block rounded-2xl px-8 py-5 text-center mb-6"
            style={{ backgroundColor: "rgba(245,200,66,0.12)", border: "1px solid rgba(245,200,66,0.25)" }}
          >
            <p className="text-white/60 text-sm mb-1 italic">If income is unstable, shift to:</p>
            <p className="text-white font-bold text-lg">
              60% reinvestment · 20% pay · 20% buffer
            </p>
          </div>

          <blockquote className="mt-8">
            <p
              className="text-xl md:text-2xl font-bold italic text-white/90 max-w-2xl mx-auto"
            >
              &ldquo;Treat your digital income like venture capital you control.&rdquo;
            </p>
            <cite
              className="block mt-3 text-sm font-semibold not-italic"
              style={{ color: "#F5C842" }}
            >
              — Bimbo Oyedotun
            </cite>
          </blockquote>
        </div>
      </section>

      {/* ── IS THIS FOR YOU? ─────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

          <div>
            <p
              className="text-xs font-bold tracking-widest uppercase mb-4"
              style={{ color: "#F5C842", WebkitTextStroke: "0.5px #b38e00" }}
            >
              Who This Is For
            </p>
            <h2
              className="text-4xl font-extrabold tracking-tight mb-8"
              style={{ color: "#160C5A" }}
            >
              This Session Is For You If...
            </h2>
            <ul className="space-y-4">
              {[
                "You want to generate predictable digital income — not just one-off wins",
                "You need a clear system for reinvesting what you earn",
                "You're ready to separate your personal and business finances",
                "You want a 90-day action plan you can start immediately",
                "You want to use AI tools to accelerate your digital skills",
                "You're serious about building a self-funded business without debt",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2
                    className="h-5 w-5 mt-0.5 shrink-0"
                    style={{ color: "#160C5A" }}
                  />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Founder Rule card */}
          <div
            className="rounded-3xl p-10 text-center"
            style={{ backgroundColor: "#160C5A" }}
          >
            <p
              className="text-xs font-bold tracking-widest uppercase mb-6"
              style={{ color: "#F5C842" }}
            >
              The Founder Rule
            </p>
            <p className="text-white text-2xl md:text-3xl font-extrabold leading-snug mb-6">
              Use services to fund products.
              <br />
              <span style={{ color: "#F5C842" }}>Use products to fund scale.</span>
            </p>
            <p className="text-white/60 text-base leading-relaxed mb-8">
              This is the system Bimbo teaches. Not theory — a real, executable loop
              that compounds your income over time.
            </p>
            <a
              href="/form"
              className="inline-flex items-center gap-2 rounded-full px-7 py-3.5 font-bold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#F5C842", color: "#160C5A" }}
            >
              I&apos;m Ready — Register Now <ArrowRight className="h-4 w-4" />
            </a>
          </div>

        </div>
      </section>

      {/* ── COACHES ──────────────────────────────────────── */}
      <section
        id="coaches"
        className="py-20 px-6"
        style={{ backgroundColor: "#f8f7ff" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p
              className="text-xs font-bold tracking-widest uppercase mb-3"
              style={{ color: "#F5C842", WebkitTextStroke: "0.5px #b38e00" }}
            >
              Your Coaches
            </p>
            <h2
              className="text-4xl font-extrabold tracking-tight"
              style={{ color: "#160C5A" }}
            >
              Meet the People Teaching You
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Bimbo */}
            <div
              className="rounded-3xl p-8 text-center"
              style={{ backgroundColor: "#160C5A" }}
            >
              <div
                className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl font-black text-white"
                style={{
                  background: "linear-gradient(135deg, #2a1d9e, #0f0840)",
                  boxShadow: "0 0 0 4px #F5C842",
                }}
              >
                BO
              </div>
              <h3 className="text-white font-extrabold text-xl">Bimbo Oyedotun</h3>
              <p className="font-semibold text-sm mt-1 mb-4" style={{ color: "#F5C842" }}>
                Wealth Systems Architect · Lead Coach
              </p>
              <p className="text-white/65 text-sm leading-relaxed">
                Bimbo Oyedotun is a financial strategist and entrepreneur who has
                helped hundreds of people build digital income streams that fund
                real businesses. She brings clarity, executable systems, and
                personal accountability to every session she runs.
              </p>
            </div>

            {/* Tony */}
            <div
              className="rounded-3xl p-8 text-center border-2"
              style={{ borderColor: "#160C5A", backgroundColor: "white" }}
            >
              <div
                className="w-24 h-24 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl font-black text-white"
                style={{
                  background: "linear-gradient(135deg, #160C5A, #2a1d9e)",
                  boxShadow: "0 0 0 4px #160C5A",
                }}
              >
                TJ
              </div>
              <h3
                className="font-extrabold text-xl"
                style={{ color: "#160C5A" }}
              >
                Tony Orjiako
              </h3>
              <p
                className="font-semibold text-sm mt-1 mb-4"
                style={{ color: "#F5C842", WebkitTextStroke: "0.3px #b38e00" }}
              >
                AI & Digital Skills Expert · Special Guest
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Tony Orjiako joins as a special guest to deliver a dedicated
                1-hour AI training session. He&apos;ll show you exactly how to
                use AI tools to develop your digital skills faster, find income
                opportunities, and accelerate your business journey from day one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────── */}
      <section id="register" className="py-20 px-6" style={{ backgroundColor: "#F5C842" }}>
        <div className="max-w-2xl mx-auto text-center">
          <p
            className="text-xs font-bold tracking-widest uppercase mb-4"
            style={{ color: "#160C5A", opacity: 0.6 }}
          >
            Limited Spots Available
          </p>
          <h2
            className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight"
            style={{ color: "#160C5A" }}
          >
            Ready to Build Your Blueprint?
          </h2>
          <p className="text-lg mb-8 font-medium" style={{ color: "#160C5A", opacity: 0.75 }}>
            One session. One system. $20 — March 28th, 2026 at 12PM EST.
          </p>

          <a
            href="/form"
            className="inline-flex items-center gap-3 rounded-full px-10 py-5 font-extrabold text-lg shadow-2xl transition-transform hover:scale-105"
            style={{ backgroundColor: "#160C5A", color: "#F5C842" }}
          >
            Secure My Spot — $20
            <ArrowRight className="h-5 w-5" />
          </a>

          <p className="mt-5 text-sm font-semibold" style={{ color: "#160C5A", opacity: 0.55 }}>
            Spots are limited. Registration closes when the session is full.
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer
        className="py-10 px-6"
        style={{ backgroundColor: "#0d0840" }}
      >
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BOLogo size={28} color="#ffffff" />
            <div>
              <p className="text-white font-bold text-sm">Bimbo Oyedotun</p>
              <p className="text-white/40 text-xs">Digital Income to Blueprint</p>
            </div>
          </div>
          <div className="flex flex-col items-center md:items-end gap-1">
            <a
              href="mailto:info@digitalincometoblueprint.ca"
              className="text-white/60 text-sm hover:text-white transition-colors"
            >
              info@digitalincometoblueprint.ca
            </a>
            <p className="text-white/30 text-xs">
              &copy; {new Date().getFullYear()} Bimbo Oyedotun. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
