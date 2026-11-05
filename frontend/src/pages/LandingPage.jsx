import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { Lock, Menu, Moon, Server, Shield, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import VideoModal from "@/components/VideoModal";
import { ProductTourSkeleton } from "@/components/landing/ProductTourSkeleton";
import { H1, NAV_LINKS, SUBLINE, TRUST_FACTS, FAQ } from "@/components/landing/copy";
import { cn } from "@/lib/utils";

const ProductTour = lazy(() => import("@/components/landing/ProductTour"));
const LandingSections = lazy(() => import("@/components/landing/LandingSections"));
const LandingFooter = lazy(() =>
  import("@/components/landing/LandingSections").then((m) => ({ default: m.LandingFooter }))
);

const AZURE_CTA =
  "bg-azure-600 text-white hover:bg-azure-700 dark:bg-azure-500 dark:hover:bg-azure-600";

const SHELL = "mx-auto w-full max-w-landing px-4 sm:px-6";

const TRUST_ICONS = {
  readonly: Shield,
  encrypted: Lock,
  server: Server,
};

function injectFaqJsonLd() {
  const id = "insightops-faq-jsonld";
  if (document.getElementById(id)) return;
  const script = document.createElement("script");
  script.id = id;
  script.type = "application/ld+json";
  script.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
  document.head.appendChild(script);
}

export default function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const demoVideoUrl =
    import.meta.env.VITE_DEMO_VIDEO_URL ||
    "https://stteamtrackerprdcin.blob.core.windows.net/insightops/insightops-demo.mp4";

  const openDemo = () => setIsVideoOpen(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    injectFaqJsonLd();
  }, []);

  const heroMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
      };

  const mockMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, delay: 0.08, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="landing min-h-screen overflow-x-clip bg-landing-canvas text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-sm focus:ring-1 focus:ring-ring"
      >
        Skip to content
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 bg-landing-canvas transition-[border-color]",
          scrolled ? "border-b border-landing-hairline" : "border-b border-transparent"
        )}
      >
        <div
          className={cn(
            SHELL,
            "grid h-14 grid-cols-[1fr_auto] items-center gap-4 md:grid-cols-[1fr_auto_1fr]"
          )}
        >
          <a href="#top" className="flex items-center gap-2 justify-self-start text-foreground">
            <img src="/icon.svg" alt="" className="size-7" width={28} height={28} />
            <span className="text-sm font-semibold tracking-tight">InsightOps</span>
          </a>

          <nav className="hidden items-center justify-center gap-6 lg:flex" aria-label="Page">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1.5 justify-self-end sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild size="sm" className={cn("hidden sm:inline-flex", AZURE_CTA)}>
              <Link to="/signup">Get started</Link>
            </Button>

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[min(100%,20rem)] bg-landing-canvas">
                <SheetHeader>
                  <SheetTitle className="text-left">InsightOps</SheetTitle>
                </SheetHeader>
                <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-control px-3 py-2.5 text-sm text-foreground hover:bg-landing-surface-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
                <div className="mt-8 flex flex-col gap-2">
                  <Button asChild variant="outline" onClick={() => setMobileOpen(false)}>
                    <Link to="/signin">Sign in</Link>
                  </Button>
                  <Button asChild className={AZURE_CTA} onClick={() => setMobileOpen(false)}>
                    <Link to="/signup">Get started</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section id="top" className="relative scroll-mt-20" aria-labelledby="hero-heading">
          <div className={cn(SHELL, "relative pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24")}>
            <motion.div {...heroMotion} className="max-w-2xl text-left">
              <p className="font-mono text-[12px] text-muted-foreground">Azure DevOps monitoring</p>
              <h1
                id="hero-heading"
                className="mt-3 text-[2.25rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-5xl sm:leading-[1.1] lg:text-[3.25rem] lg:leading-[1.08]"
              >
                {H1}
              </h1>
              <p className="mt-5 max-w-[42rem] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {SUBLINE}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button asChild size="lg" className={cn("h-10", AZURE_CTA)}>
                  <Link to="/signup">Get started</Link>
                </Button>
                <button
                  type="button"
                  onClick={openDemo}
                  className="text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  Watch the demo video
                </button>
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {TRUST_FACTS.map((fact) => {
                  const Icon = TRUST_ICONS[fact.id] || Shield;
                  return (
                    <li
                      key={fact.id}
                      className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground"
                    >
                      <Icon className="size-3.5 text-primary" aria-hidden="true" />
                      {fact.label}
                    </li>
                  );
                })}
              </ul>
            </motion.div>

            <motion.div {...mockMotion} className="mt-12 w-full lg:mt-16">
              <Suspense fallback={<ProductTourSkeleton />}>
                <ProductTour />
              </Suspense>
            </motion.div>
          </div>
        </section>

        <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
          <LandingSections onOpenDemo={openDemo} />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <LandingFooter />
      </Suspense>

      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={demoVideoUrl}
      />
    </div>
  );
}
