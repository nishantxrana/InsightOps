import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  CheckCircle2,
  GitPullRequest,
  Lock,
  Menu,
  Moon,
  Play,
  Server,
  Shield,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import VideoModal from "@/components/VideoModal";
import ProductMock from "@/components/landing/ProductMock";
import { cn } from "@/lib/utils";

const AZURE_CTA =
  "bg-azure-600 text-white hover:bg-azure-700 dark:bg-azure-500 dark:hover:bg-azure-600";

/** Shared content column — keeps nav, sections, and footer on one left/right edge */
const SHELL = "mx-auto w-full max-w-landing px-4 sm:px-6";

const NAV_LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Security", href: "#security" },
];

const PRIMARY_CAPABILITIES = [
  {
    id: "pipelines",
    title: "Pipelines and failure analysis",
    body: "See recent builds across projects, spot failures early, and open an AI diagnosis when you want one—without leaving the dashboard.",
    visual: "pipelines",
  },
  {
    id: "prs",
    title: "Pull requests with idle detection",
    body: "Track open PRs, reviewers, and branches in one list. Idle PRs surface when nothing has moved past your threshold.",
    visual: "prs",
  },
  {
    id: "sprints",
    title: "Sprints and work items",
    body: "Sprint progress, overdue items, and work-item context in one view—so standup prep is a scan, not a scavenger hunt.",
    visual: "sprints",
  },
  {
    id: "releases",
    title: "Releases and approvals",
    body: "Classic releases, environments, and pending approvals in one place, with filters that keep production noise down.",
    visual: "releases",
  },
];

const SECONDARY_CAPABILITIES = [
  {
    title: "Multi-org and multi-project",
    body: "Connect several Azure DevOps orgs and switch projects without juggling tabs.",
  },
  {
    title: "Webhooks plus polling backup",
    body: "Realtime ADO webhooks when you can; configurable polling when you cannot.",
  },
  {
    title: "Agents and workflows",
    body: "In-process monitors for build failures, PRs, and sprints that run on your server.",
  },
  {
    title: "Google Chat alerts",
    body: "Route important events to the channels your team already watches.",
  },
  {
    title: "Activity reports and PDF export",
    body: "Dashboard reports you can share as a PDF when leadership asks for a snapshot.",
  },
  {
    title: "Optional multi-provider AI",
    body: "OpenAI, Groq, or Gemini when you configure a key. Monitoring works without AI.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Connect your org",
    body: "Add a read-only PAT. InsightOps stores it encrypted and calls Azure DevOps from the server.",
    snippet: "vso.build · vso.code · vso.work",
  },
  {
    n: "2",
    title: "See everything in one dashboard",
    body: "Builds, pull requests, sprints, and releases across the orgs and projects you connect.",
    snippet: "Builds · PRs · Sprints · Releases",
  },
  {
    n: "3",
    title: "Add AI when you want it",
    body: "Configure a provider under Settings for failure analysis and summaries. Skip it if you only need visibility.",
    snippet: "OpenAI · Groq · Gemini",
  },
];

const SECURITY_CLAIMS = [
  {
    icon: Lock,
    title: "Encrypted PATs",
    body: "Organization tokens are encrypted at rest and masked in API responses.",
  },
  {
    icon: Shield,
    title: "Read-only by design",
    body: "Only read scopes. InsightOps never writes work items, queues builds, or comments on PRs.",
  },
  {
    icon: Server,
    title: "Server-side only",
    body: "Azure DevOps calls happen on the server. Tokens never ship to the browser.",
  },
];

const PAT_SCOPES = [
  { name: "Work Items → Read", id: "vso.work", used: "Sprints, overdue items, WIQL" },
  { name: "Build → Read", id: "vso.build", used: "Builds, timelines, failure analysis" },
  { name: "Code → Read", id: "vso.code", used: "Repos, PRs, commits, threads" },
  { name: "Release → Read", id: "vso.release", used: "Releases, environments, approvals" },
  { name: "Project and Team → Read", id: "vso.project", used: "List projects, test connection" },
];

function CapabilityVisual({ type }) {
  if (type === "pipelines") {
    return (
      <div
        data-ui
        className="w-full rounded-xl border border-landing-hairline bg-landing-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-foreground">api-ci #2841</span>
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[12px] text-red-700 dark:text-red-400">
            <span className="size-1.5 rounded-full bg-red-500" aria-hidden="true" />
            Failed
          </span>
        </div>
        <p className="mt-2 font-mono text-[12px] text-muted-foreground">main · a3f9c2e · 4m 12s</p>
        <div className="mt-3 rounded-md border border-landing-hairline bg-landing-canvas px-3 py-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            Analysis
          </p>
          <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
            AuthService.refreshToken timed out on Redis pool under parallel workers.
          </p>
        </div>
      </div>
    );
  }

  if (type === "prs") {
    return (
      <div
        data-ui
        className="w-full space-y-2 rounded-xl border border-landing-hairline bg-landing-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        {[
          { id: "412", title: "Webhook retry backoff", status: "Active", tone: "azure" },
          { id: "409", title: "Burndown timezone", status: "Idle 3d", tone: "amber" },
        ].map((pr) => (
          <div
            key={pr.id}
            className="flex items-center justify-between gap-3 rounded-md border border-landing-hairline px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] text-foreground">{pr.title}</p>
              <p className="font-mono text-[11px] text-muted-foreground">#{pr.id}</p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-md bg-muted px-2 py-0.5 text-[12px]",
                pr.tone === "amber"
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-azure-700 dark:text-azure-400"
              )}
            >
              {pr.status}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (type === "sprints") {
    return (
      <div
        data-ui
        className="w-full rounded-xl border border-landing-hairline bg-landing-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-foreground">Sprint 42</p>
            <p className="text-[12px] text-muted-foreground">12 / 18 closed</p>
          </div>
          <p className="font-mono text-2xl font-medium tabular-nums tracking-tight text-foreground">
            68%
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-[68%] rounded-full bg-azure-600 dark:bg-azure-500" />
        </div>
        <ul className="mt-3 space-y-1.5 text-[13px] text-muted-foreground">
          <li className="flex justify-between gap-2">
            <span>WI-1182 Pipeline digest</span>
            <span className="text-foreground">Active</span>
          </li>
          <li className="flex justify-between gap-2">
            <span>WI-1174 Idle PR setting</span>
            <span className="text-foreground">Resolved</span>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <div
      data-ui
      className="w-full rounded-xl border border-landing-hairline bg-landing-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <p className="text-[13px] font-medium text-foreground">Release 2.4.1</p>
      <p className="mt-1 text-[12px] text-muted-foreground">Production · pending approval</p>
      <div className="mt-3 space-y-2">
        {["Dev", "Staging", "Production"].map((env, i) => (
          <div key={env} className="flex items-center justify-between text-[13px]">
            <span className="text-muted-foreground">{env}</span>
            {i < 2 ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
                Succeeded
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                <GitPullRequest className="size-3.5" aria-hidden="true" />
                Approval
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
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

  const heroMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
      };

  const mockMotion = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] },
      };

  return (
    <div className="landing min-h-screen overflow-x-clip text-foreground">
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

          <nav className="hidden items-center justify-center gap-7 md:flex" aria-label="Page">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="md:hidden"
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
                      className="rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-landing-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="landing-dot-grid pointer-events-none absolute inset-0 opacity-[0.08]"
            aria-hidden="true"
          />
          <div className={cn(SHELL, "relative pb-16 pt-16 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24")}>
            <motion.div {...heroMotion} className="max-w-2xl text-left">
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Azure DevOps monitoring
              </p>
              <h1 className="mt-3 text-[2.5rem] font-semibold leading-[1.12] tracking-[-0.03em] text-foreground sm:text-5xl sm:leading-[1.1] lg:text-[3.25rem] lg:leading-[1.08]">
                Sprints, builds, PRs, and releases
                <span className="block">in one place</span>
              </h1>
              <p className="mt-5 max-w-[40rem] text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                InsightOps gives engineering teams a quiet dashboard over Azure DevOps: encrypted
                read-only access, optional AI analysis, and the signal without the tab sprawl.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className={AZURE_CTA}>
                  <Link to="/signup">Get started</Link>
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={openDemo}>
                  <Play className="size-4" aria-hidden="true" />
                  View demo
                </Button>
              </div>
              <p className="mt-5 text-[13px] text-muted-foreground">
                Read-only PAT. Encrypted at rest.
              </p>
            </motion.div>

            <motion.div {...mockMotion} className="mt-12 w-full lg:mt-16">
              <ProductMock onOpenDemo={openDemo} />
            </motion.div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="product" className="scroll-mt-20 border-t border-landing-hairline">
          <div className={cn(SHELL, "py-24 sm:py-28")}>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              What you can see
            </h2>
            <p className="mt-3 max-w-[48ch] text-base text-muted-foreground">
              The surfaces your team already lives in—brought together with enough detail to act.
            </p>

            <div className="mt-14 space-y-20 sm:space-y-24">
              {PRIMARY_CAPABILITIES.map((cap, index) => {
                const reverse = index % 2 === 1;
                return (
                  <div key={cap.id} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
                    <div className={cn(reverse && "lg:order-2")}>
                      <h3 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {cap.title}
                      </h3>
                      <p className="mt-3 max-w-[42ch] text-base leading-relaxed text-muted-foreground">
                        {cap.body}
                      </p>
                    </div>
                    <div className={cn("w-full", reverse && "lg:order-1")}>
                      <CapabilityVisual type={cap.visual} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-20 border-t border-landing-hairline pt-12 sm:mt-24">
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Also included
              </h3>
              <ul className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
                {SECONDARY_CAPABILITIES.map((item) => (
                  <li key={item.title} className="min-w-0">
                    <p className="text-[15px] font-medium text-foreground">{item.title}</p>
                    <p className="mt-1.5 max-w-[40ch] text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-landing-hairline bg-landing-surface"
        >
          <div className={cn(SHELL, "py-24 sm:py-28")}>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 max-w-[44ch] text-base text-muted-foreground">
              Three steps from a PAT to a dashboard your team can trust.
            </p>

            <ol className="mt-14 grid gap-10 sm:gap-8 lg:grid-cols-3 lg:gap-8">
              {STEPS.map((step, index) => (
                <li key={step.n} className="relative flex min-w-0 flex-col">
                  <div className="flex items-center">
                    <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-md border border-landing-hairline bg-landing-surface font-mono text-sm font-medium tabular-nums text-foreground">
                      {step.n}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className="relative ml-0 hidden h-px min-w-0 flex-1 bg-landing-hairline lg:block"
                        aria-hidden="true"
                      >
                        {/* Bridge the column gap so the line meets the next badge */}
                        <span className="absolute inset-y-0 left-0 right-[-2rem] top-0 h-px bg-landing-hairline" />
                      </div>
                    )}
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  <p className="mt-4 inline-flex w-fit max-w-full rounded-md border border-landing-hairline bg-landing-canvas px-3 py-2 font-mono text-[11px] leading-none text-muted-foreground">
                    {step.snippet}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="scroll-mt-20 border-t border-landing-hairline">
          <div className={cn(SHELL, "py-24 sm:py-28")}>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Security
            </h2>
            <p className="mt-3 max-w-[48ch] text-base text-muted-foreground">
              Built for teams that treat Azure DevOps credentials as production secrets.
            </p>

            <div className="mt-12 grid gap-8 rounded-xl border border-landing-hairline bg-landing-surface p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)] lg:gap-12">
              <ul className="space-y-6">
                {SECURITY_CLAIMS.map((claim) => {
                  const Icon = claim.icon;
                  return (
                    <li key={claim.title} className="flex gap-3">
                      <Icon
                        className="mt-0.5 size-4 shrink-0 text-azure-600 dark:text-azure-400"
                        aria-hidden="true"
                      />
                      <div>
                        <h3 className="text-[15px] font-medium text-foreground">{claim.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                          {claim.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="min-w-0">
                <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Required PAT scopes
                </p>
                <div className="overflow-x-auto rounded-md border border-landing-hairline">
                  <table className="w-full min-w-[28rem] text-left text-sm">
                    <caption className="sr-only">
                      Azure DevOps PAT scopes required by InsightOps
                    </caption>
                    <thead>
                      <tr className="border-b border-landing-hairline bg-landing-canvas text-muted-foreground">
                        <th scope="col" className="px-3 py-2.5 font-medium">
                          Scope
                        </th>
                        <th scope="col" className="px-3 py-2.5 font-medium">
                          ID
                        </th>
                        <th scope="col" className="px-3 py-2.5 font-medium">
                          Access
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {PAT_SCOPES.map((scope) => (
                        <tr
                          key={scope.id}
                          className="border-b border-landing-hairline last:border-0"
                        >
                          <td className="px-3 py-2.5 text-foreground">
                            <span className="block">{scope.name}</span>
                            <span className="mt-0.5 block text-[12px] text-muted-foreground">
                              {scope.used}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <code className="font-mono text-[12px] text-foreground">
                              {scope.id}
                            </code>
                          </td>
                          <td className="px-3 py-2.5">
                            <Badge
                              variant="secondary"
                              className="rounded-md font-mono text-[11px] font-normal"
                            >
                              Read
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  No write scopes. InsightOps never creates work items, queues builds, or comments
                  on PRs.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-landing-hairline bg-landing-surface">
          <div className={cn(SHELL, "py-20 sm:py-24")}>
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Put Azure DevOps in one dashboard
              </h2>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className={AZURE_CTA}>
                  <Link to="/signup">Get started</Link>
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={openDemo}>
                  <Play className="size-4" aria-hidden="true" />
                  View demo
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-landing-hairline">
        <div className={cn(SHELL, "grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4")}>
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <img src="/icon.svg" alt="" className="size-6" width={24} height={24} />
              <span className="text-sm font-semibold text-foreground">InsightOps</span>
            </div>
            <p className="mt-3 max-w-[28ch] text-sm text-muted-foreground">
              Azure DevOps visibility for engineering teams.
            </p>
          </div>

          <div>
            <p className="text-[13px] font-medium text-foreground">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-medium text-foreground">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <Link to="/signin" className="hover:text-foreground">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-foreground">
                  Sign up
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-[13px] font-medium text-foreground">Resources</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <button
                  type="button"
                  onClick={openDemo}
                  className="hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Demo video
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-landing-hairline">
          <p className={cn(SHELL, "py-6 text-[13px] text-muted-foreground")}>
            © {new Date().getFullYear()} InsightOps. All rights reserved.
          </p>
        </div>
      </footer>

      <VideoModal
        isOpen={isVideoOpen}
        onClose={() => setIsVideoOpen(false)}
        videoUrl={demoVideoUrl}
      />
    </div>
  );
}
