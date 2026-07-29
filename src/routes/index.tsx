import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

export const Route = createFileRoute("/")({
  component: Home,
});

/* ─── Inline SVG Icons (Lucide-style, 24×24, stroke-width 2) ─── */

function IconRecord() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

function IconMark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M2 12h20" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function IconShare() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconZap() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconGamepad() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function IconSmartphone() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function IconCrown() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M3 20h18" />
    </svg>
  );
}

/* ─── Game tag colours (Valorant, CS2, etc.) ─── */
const games = [
  "Valorant",
  "CS2",
  "Call of Duty",
  "Apex Legends",
  "Overwatch",
];

/* ─── Waitlist Form ─── */
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitted" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();

    if (!trimmed) {
      setStatus("error");
      setErrorMsg("Email is required.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setStatus("error");
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("submitted");
    setEmail("");
    setErrorMsg("");
  };

  if (status === "submitted") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-victory-green/30 bg-victory-green/5 px-6 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-victory-green/20 text-victory-green">
          <IconCheck />
        </div>
        <p className="font-subheading text-xl font-semibold text-white">
          You&apos;re on the list!
        </p>
        <p className="text-sm text-gray-2">
          We&apos;ll notify you when FragClip launches. Get ready to clip.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            placeholder="you@example.com"
            className={`w-full rounded-sm border bg-charcoal px-4 py-3 text-white placeholder-gray-2 transition-colors focus:outline-none focus:ring-2 focus:ring-frag-orange/50 ${
              status === "error"
                ? "border-kill-red"
                : "border-gray-3"
            }`}
            aria-label="Email address"
          />
        </div>
        <button
          type="submit"
          className="rounded-sm bg-frag-orange px-6 py-3 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] active:scale-[0.98] cursor-pointer"
        >
          Join the waitlist
        </button>
      </div>
      {status === "error" && (
        <p className="text-sm text-kill-red">{errorMsg}</p>
      )}
    </form>
  );
}

/* ─── Section Wrapper ─── */
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`py-16 md:py-24 ${className}`}>
      <div className="mx-auto max-w-[1280px] px-6">{children}</div>
    </section>
  );
}

/* ─── Main Page ─── */
function Home() {
  return (
    <div className="overflow-x-hidden">
      {/* Nav */}
      <Nav />

      {/* Hero */}
      <Hero />

      {/* How It Works */}
      <HowItWorks />

      {/* Features */}
      <Features />

      {/* Pricing */}
      <Pricing />

      {/* Waitlist */}
      <Waitlist />

      {/* Footer */}
      <Footer />
    </div>
  );
}

/* ─── Nav ─── */
function Nav() {
  return (
    <nav className="sticky top-0 z-20 border-b border-charcoal/50 bg-abyss/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
        <a href="#" className="flex items-center gap-3">
          <img src="/logo.png" alt="FragClip" className="h-8 w-8" />
          <span className="font-heading text-2xl tracking-[0.02em] text-frag-orange">
            FRAGCLIP
          </span>
        </a>
        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-gray-1 transition-colors hover:text-white"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-gray-1 transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-gray-1 transition-colors hover:text-white"
          >
            Pricing
          </a>
          <Link
            to="/app"
            className="rounded-sm bg-frag-orange px-5 py-2 font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] cursor-pointer"
          >
            Get Early Access
          </Link>
        </div>
        {/* Mobile CTA */}
        <Link
          to="/app"
          className="rounded-sm bg-frag-orange px-4 py-1.5 font-body text-xs font-semibold text-white md:hidden cursor-pointer"
        >
          Join
        </Link>
      </div>
    </nav>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="relative flex min-h-[85dvh] items-center justify-center overflow-hidden">
      {/* Background image with overlay */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/hero-bg.png"
          alt=""
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
        {/* Dark overlay + gradient fade at bottom */}
        <div className="absolute inset-0 bg-abyss/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-6 py-24 text-center">
        <img
          src="/logo.png"
          alt="FragClip logo"
          className="mx-auto mb-6 h-16 w-16 md:h-20 md:w-20"
        />
        <h1 className="mx-auto max-w-4xl font-heading text-5xl leading-[1.05] tracking-[-0.02em] text-white md:text-7xl lg:text-8xl">
          Your Gameplay. Your Highlights.{" "}
          <span className="text-frag-orange">Zero Effort.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-1 md:text-lg">
          FragClip automatically clips your best FPS moments — kills,
          headshots, multikills — and exports them for TikTok, Shorts, and
          Reels.
        </p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to="/app"
            className="inline-flex rounded-sm bg-frag-orange px-8 py-3.5 font-body text-base font-semibold text-white transition-all hover:bg-[#FF7A33] active:scale-[0.98] cursor-pointer"
          >
            Get Early Access
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex rounded-sm border border-frag-orange px-8 py-3.5 font-body text-base font-semibold text-frag-orange transition-all hover:bg-frag-orange/10 cursor-pointer"
          >
            How It Works
          </a>
        </div>

        {/* Game badges */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
          {games.map((game) => (
            <span
              key={game}
              className="rounded-pill border border-charcoal bg-void/80 px-3 py-1 font-mono text-xs text-gray-2 backdrop-blur-sm"
            >
              {game}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─── */
function HowItWorks() {
  const steps = [
    {
      icon: <IconRecord />,
      title: "Record",
      body: "Use OBS, ShadowPlay, or any capture tool you already use. FragClip works with your existing setup.",
    },
    {
      icon: <IconMark />,
      title: "Mark",
      body: "Press a hotkey during gameplay to mark moments, or drop markers on the timeline after your session.",
    },
    {
      icon: <IconShare />,
      title: "Share",
      body: "Export perfect vertical clips for TikTok, Shorts, and Reels in one click — no editing required.",
    },
  ];

  return (
    <Section id="how-it-works">
      <div className="text-center">
        <h2 className="font-heading text-4xl tracking-[0.02em] md:text-5xl">
          How It <span className="text-frag-orange">Works</span>
        </h2>
        <p className="mt-3 text-gray-2">
          Three steps from raw footage to ready-to-post highlights.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className="group relative rounded-md border border-charcoal bg-void p-8 transition-all hover:border-frag-orange/30"
          >
            <div className="mb-1 font-mono text-sm text-gray-3">
              0{i + 1}
            </div>
            <div className="mb-4 text-frag-orange">{step.icon}</div>
            <h3 className="font-subheading text-xl font-semibold text-white">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-2">
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─── Features ─── */
function Features() {
  const features = [
    {
      icon: <IconZap />,
      title: "Auto-Detect Key Moments",
      body: "Kills, headshots, multikills, wins — FragClip finds your best plays so you don't have to scrub through hours of footage.",
    },
    {
      icon: <IconGamepad />,
      title: "Multi-Game Support",
      body: "Valorant, CS2, Call of Duty, Apex Legends, Overwatch — one tool for every game you play.",
    },
    {
      icon: <IconSmartphone />,
      title: "One-Click Social Export",
      body: "Export in 9:16 vertical formats optimized for TikTok, YouTube Shorts, and Instagram Reels.",
    },
    {
      icon: <IconCrown />,
      title: "Watermark-Free on Pro",
      body: "Pro tier removes all watermarks. Your clips, your brand — share them anywhere, no strings attached.",
    },
  ];

  return (
    <Section id="features" className="bg-void">
      <div className="text-center">
        <h2 className="font-heading text-4xl tracking-[0.02em] md:text-5xl">
          Built for{" "}
          <span className="text-gradient-signature">Fraggers</span>
        </h2>
        <p className="mt-3 text-gray-2">
          Everything you need to turn gameplay into content.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        {features.map((feat) => (
          <div
            key={feat.title}
            className="flex gap-5 rounded-md border border-charcoal bg-abyss p-6 transition-all hover:border-frag-orange/20"
          >
            <div className="mt-0.5 shrink-0 text-frag-orange">{feat.icon}</div>
            <div>
              <h3 className="font-subheading text-lg font-semibold text-white">
                {feat.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-2">
                {feat.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─── Pricing ─── */
function Pricing() {
  return (
    <Section id="pricing">
      <div className="text-center">
        <h2 className="font-heading text-4xl tracking-[0.02em] md:text-5xl">
          Simple <span className="text-frag-orange">Pricing</span>
        </h2>
        <p className="mt-3 text-gray-2">
          Start free. Upgrade when you&apos;re ready to go pro.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-2xl gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-md border border-charcoal bg-void p-8">
          <p className="font-subheading text-sm font-semibold uppercase tracking-[0.05em] text-gray-2">
            Free
          </p>
          <p className="mt-2 font-heading text-5xl tracking-[0.02em] text-white">
            $0
          </p>
          <p className="text-sm text-gray-2">forever</p>

          <ul className="mt-6 space-y-3 text-sm text-gray-1">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              10 clips per month
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Watermarked exports
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Basic auto-clip triggers
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Single game profile
            </li>
          </ul>

          <Link
            to="/app"
            className="mt-8 block rounded-sm border border-frag-orange py-3 text-center font-body text-sm font-semibold text-frag-orange transition-all hover:bg-frag-orange/10 cursor-pointer"
          >
            Get Started Free
          </Link>
        </div>

        {/* Pro */}
        <div className="relative rounded-md border border-frag-orange/40 bg-void p-8 border-glow">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-frag-orange px-4 py-1 font-body text-xs font-semibold text-white">
            MOST POPULAR
          </div>
          <p className="font-subheading text-sm font-semibold uppercase tracking-[0.05em] text-frag-orange">
            Pro
          </p>
          <p className="mt-2 font-heading text-5xl tracking-[0.02em] text-white">
            $5
          </p>
          <p className="text-sm text-gray-2">/ month</p>

          <ul className="mt-6 space-y-3 text-sm text-gray-1">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Unlimited clips
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              No watermarks — ever
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Custom trigger rules
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Multi-game profiles
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-victory-green">
                <IconCheck />
              </span>
              Priority export formats
            </li>
          </ul>

          <Link
            to="/app"
            className="mt-8 block rounded-sm bg-frag-orange py-3 text-center font-body text-sm font-semibold text-white transition-all hover:bg-[#FF7A33] cursor-pointer"
          >
            Go Pro
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ─── Waitlist CTA ─── */
function Waitlist() {
  return (
    <Section id="waitlist" className="bg-void">
      <div className="flex flex-col items-center text-center">
        <h2 className="font-heading text-4xl tracking-[0.02em] md:text-5xl">
          Ready to{" "}
          <span className="text-gradient-signature">Clip?</span>
        </h2>
        <p className="mt-3 max-w-md text-gray-2">
          FragClip is launching soon. Join the waitlist to be first in line —
          and get early access before everyone else.
        </p>

        <div className="mt-8 w-full">
          <WaitlistForm />
        </div>

        <p className="mt-4 text-xs text-gray-3">
          No spam. Unsubscribe anytime. We hate spam as much as you hate
          missing a clutch clip.
        </p>
      </div>
    </Section>
  );
}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="border-t border-charcoal bg-abyss">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-6 px-6 py-10 md:flex-row md:justify-between">
        {/* Brand */}
        <a href="#" className="flex items-center gap-3">
          <img src="/logo.png" alt="FragClip" className="h-7 w-7" />
          <span className="font-heading text-xl tracking-[0.02em] text-frag-orange">
            FRAGCLIP
          </span>
        </a>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-2">
          <a
            href="#features"
            className="transition-colors hover:text-white"
          >
            Features
          </a>
          <a
            href="#pricing"
            className="transition-colors hover:text-white"
          >
            Pricing
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-white"
          >
            FAQ
          </a>
        </div>

        {/* Copyright */}
        <p className="text-sm text-gray-3">
          &copy; 2026 FragClip. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
