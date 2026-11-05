import { Link } from "react-router-dom";
import { Bot, Brain, Cloud, Lock, MessageSquare, Server, Shield, Zap } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { AiInsightPanel } from "@/components/kit/AiInsightPanel";
import { StatusBadge } from "@/components/kit/StatusBadge";
import { cn } from "@/lib/utils";
import { BentoVisual } from "./BentoVisuals";
import { BUILDS } from "./mockData";
import {
  AI_SECTION,
  BENTO,
  CLOSING,
  FAQ,
  INTEGRATIONS,
  NAV_LINKS,
  PAT_SCOPES,
  PROBLEMS,
  SOLUTIONS,
  STEPS,
} from "./copy";

const AZURE_CTA =
  "bg-azure-600 text-white hover:bg-azure-700 dark:bg-azure-500 dark:hover:bg-azure-600";

const SHELL = "mx-auto w-full max-w-landing px-4 sm:px-6";

const ICON_MAP = {
  Cloud,
  Bot,
  Zap,
  Brain,
  MessageSquare,
};

function Reveal({ children, className }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ConnectFormFragment() {
  return (
    <div
      data-ui
      className="rounded-panel border border-border bg-surface p-3 text-left shadow-none"
    >
      <p className="text-[13px] font-medium text-foreground">Add organization</p>
      <label className="mt-3 block text-[11px] text-muted-foreground">
        Organization URL
        <span className="mt-1 block rounded-control border border-input bg-background px-2 py-1.5 font-mono text-[12px] text-foreground">
          https://dev.azure.com/acme
        </span>
      </label>
      <label className="mt-2 block text-[11px] text-muted-foreground">
        Personal access token
        <span className="mt-1 block rounded-control border border-input bg-background px-2 py-1.5 font-mono text-[12px] tracking-widest text-foreground">
          ••••••••••••••••
        </span>
      </label>
      <div className="mt-2 flex flex-wrap gap-1">
        {["vso.work", "vso.build", "vso.code", "vso.release", "vso.project"].map((s) => (
          <span
            key={s}
            className="rounded-control bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {s} · Read
          </span>
        ))}
      </div>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 420 160"
      className="h-auto w-full text-foreground"
      role="img"
      aria-label="Browser connects to InsightOps API, which calls Azure DevOps. PAT never reaches the browser."
    >
      <rect
        x="8"
        y="48"
        width="100"
        height="64"
        rx="8"
        className="fill-surface stroke-border"
        strokeWidth="1"
      />
      <text
        x="58"
        y="78"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="12"
        fontFamily="Inter, sans-serif"
      >
        Browser
      </text>
      <text
        x="58"
        y="96"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        SPA
      </text>

      <path d="M112 80 H168" className="stroke-border" strokeWidth="1.5" markerEnd="url(#arrow)" />

      <rect
        x="170"
        y="40"
        width="120"
        height="80"
        rx="8"
        className="fill-surface stroke-border"
        strokeWidth="1"
      />
      <text
        x="230"
        y="72"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="12"
        fontFamily="Inter, sans-serif"
      >
        InsightOps API
      </text>
      <text
        x="230"
        y="90"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        Encrypted PAT
      </text>
      <text
        x="230"
        y="106"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="10"
        fontFamily="Inter, sans-serif"
      >
        Server-side only
      </text>

      <path d="M294 80 H348" className="stroke-border" strokeWidth="1.5" markerEnd="url(#arrow)" />

      <rect
        x="350"
        y="48"
        width="62"
        height="64"
        rx="8"
        className="fill-surface stroke-border"
        strokeWidth="1"
      />
      <text
        x="381"
        y="78"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="11"
        fontFamily="Inter, sans-serif"
      >
        Azure
      </text>
      <text
        x="381"
        y="94"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="11"
        fontFamily="Inter, sans-serif"
      >
        DevOps
      </text>

      <text
        x="210"
        y="148"
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize="11"
        fontFamily="Inter, sans-serif"
      >
        PAT never reaches the browser
      </text>

      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6" className="fill-border" />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * Below-the-fold landing sections (lazy-loaded).
 * @param {{ onOpenDemo: () => void }} props
 */
export default function LandingSections({ onOpenDemo }) {
  const reduceMotion = useReducedMotion();
  const failed = BUILDS.find((b) => b.result === "failed");

  return (
    <>
      {/* Works with */}
      <section aria-labelledby="works-with-heading" className="border-t border-landing-hairline">
        <div className={cn(SHELL, "py-12 sm:py-14")}>
          <h2 id="works-with-heading" className="sr-only">
            Works with
          </h2>
          <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {INTEGRATIONS.map((item) => {
              const Icon = ICON_MAP[item.icon] || Cloud;
              return (
                <li
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-control border border-landing-hairline bg-landing-surface px-3 py-1.5 text-[13px] text-muted-foreground"
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Problem → solution */}
      <section
        id="product"
        className="scroll-mt-20 border-t border-landing-hairline bg-landing-surface"
      >
        <div className={cn(SHELL, "py-20 sm:py-24")}>
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              From buried signal to one view
            </h2>
            <p className="mt-3 max-w-[48ch] text-base text-muted-foreground">
              The daily friction of Azure DevOps tabs, and how InsightOps answers it.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <h3 className="text-sm font-semibold text-foreground">The problem</h3>
              <ul className="mt-4 space-y-3">
                {PROBLEMS.map((p) => (
                  <li
                    key={p}
                    className="rounded-panel border border-landing-hairline bg-landing-canvas px-4 py-3 text-sm text-muted-foreground"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal>
              <h3 className="text-sm font-semibold text-foreground">The answer</h3>
              <ul className="mt-4 space-y-3">
                {SOLUTIONS.map((s) => (
                  <li
                    key={s}
                    className="rounded-panel border border-landing-hairline bg-landing-canvas px-4 py-3 text-sm text-foreground"
                  >
                    {s}
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-ui>
                <BentoVisual id="pipelines" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Bento capabilities */}
      <section className="scroll-mt-20 border-t border-landing-hairline">
        <div className={cn(SHELL, "py-20 sm:py-24")}>
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              What you can see
            </h2>
            <p className="mt-3 max-w-[48ch] text-base text-muted-foreground">
              Surfaces your team already lives in—brought together with enough detail to act.
            </p>
          </Reveal>

          <div className="mt-12 grid auto-rows-fr gap-4 md:grid-cols-6">
            {BENTO.map((tile) => {
              const span =
                tile.size === "large"
                  ? "md:col-span-4 md:row-span-2"
                  : tile.size === "medium"
                    ? "md:col-span-2"
                    : "md:col-span-3 lg:col-span-2";
              return (
                <motion.article
                  key={tile.id}
                  className={cn(
                    "flex flex-col rounded-panel border border-landing-hairline bg-landing-surface p-4 sm:p-5",
                    span
                  )}
                  whileHover={reduceMotion ? undefined : { y: -2 }}
                  transition={{ duration: 0.15 }}
                >
                  <div className="min-h-0 flex-1">{<BentoVisual id={tile.id} />}</div>
                  <h3 className="mt-4 text-[15px] font-semibold text-foreground">{tile.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {tile.body}
                  </p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI */}
      <section id="ai" className="scroll-mt-20 border-t border-landing-hairline bg-landing-surface">
        <div className={cn(SHELL, "py-20 sm:py-24")}>
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {AI_SECTION.title}
              </h2>
              <p className="mt-4 max-w-[44ch] text-base leading-relaxed text-muted-foreground">
                {AI_SECTION.body}
              </p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {["OpenAI", "Groq", "Google Gemini"].map((p) => (
                  <li
                    key={p}
                    className="rounded-control border border-landing-hairline bg-landing-canvas px-3 py-1.5 text-[13px] text-foreground"
                  >
                    {p}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-medium text-foreground">
                Monitoring works without AI.
              </p>
            </Reveal>
            <Reveal>
              <AiInsightPanel
                title="Sample analysis"
                provider="Sample"
                state="ready"
                markdown={failed.analysisMarkdown}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-landing-hairline">
        <div className={cn(SHELL, "py-20 sm:py-24")}>
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              How it works
            </h2>
            <p className="mt-3 max-w-[44ch] text-base text-muted-foreground">
              Three steps from a read-only PAT to a dashboard your team can trust.
            </p>
          </Reveal>

          <ol className="mt-14 grid gap-10 lg:grid-cols-3 lg:gap-8">
            {STEPS.map((step, index) => (
              <li key={step.n} className="relative flex min-w-0 flex-col">
                <div className="flex items-center">
                  <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-control border border-landing-hairline bg-landing-surface font-mono text-sm font-medium tabular-nums text-foreground">
                    {step.n}
                  </div>
                  {index < STEPS.length - 1 ? (
                    <div
                      className="relative ml-0 hidden h-px min-w-0 flex-1 bg-landing-hairline lg:block"
                      aria-hidden="true"
                    >
                      <span className="absolute inset-y-0 left-0 right-[-2rem] top-0 h-px bg-landing-hairline" />
                    </div>
                  ) : null}
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
                <div className="mt-4">
                  {index === 0 ? <ConnectFormFragment /> : null}
                  {index === 1 ? (
                    <div data-ui className="rounded-panel border border-border bg-surface p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {["Builds", "PRs", "Sprints", "Releases"].map((l) => (
                          <StatusBadge key={l} tone="neutral" label={l} dot={false} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {index === 2 ? (
                    <div
                      data-ui
                      className="rounded-panel border border-border bg-surface p-3 text-[12px] text-muted-foreground"
                    >
                      AI providers · Google Chat alerts
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Security */}
      <section
        id="security"
        className="scroll-mt-20 border-t border-landing-hairline bg-landing-surface"
      >
        <div className={cn(SHELL, "py-20 sm:py-24")}>
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Security and trust
            </h2>
            <p className="mt-3 max-w-[48ch] text-base text-muted-foreground">
              Built for teams that treat Azure DevOps credentials as production secrets.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal className="rounded-panel border border-landing-hairline bg-landing-canvas p-4 sm:p-6">
              <ArchitectureDiagram />
              <ul className="mt-6 space-y-4">
                <li className="flex gap-3">
                  <Lock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-[15px] font-medium text-foreground">Encrypted PATs</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Organization tokens are encrypted at rest and masked in API responses.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Shield className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-[15px] font-medium text-foreground">Read-only by design</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Only read scopes. InsightOps never writes work items, queues builds, or
                      comments on PRs.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <Server className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <p className="text-[15px] font-medium text-foreground">Server-side only</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Azure DevOps calls happen on the server. Tokens never ship to the browser.
                    </p>
                  </div>
                </li>
              </ul>
            </Reveal>

            <Reveal>
              <p className="mb-3 text-sm font-medium text-foreground">Required PAT scopes</p>
              <div className="overflow-x-auto rounded-panel border border-landing-hairline bg-landing-canvas">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <caption className="sr-only">
                    Azure DevOps PAT scopes required by InsightOps
                  </caption>
                  <thead>
                    <tr className="border-b border-landing-hairline text-muted-foreground">
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
                      <tr key={scope.id} className="border-b border-landing-hairline last:border-0">
                        <td className="px-3 py-2.5 text-foreground">
                          <span className="block">{scope.name}</span>
                          <span className="mt-0.5 block text-[12px] text-muted-foreground">
                            {scope.used}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <code className="font-mono text-[12px] text-foreground">{scope.id}</code>
                        </td>
                        <td className="px-3 py-2.5">
                          <Badge
                            variant="secondary"
                            className="rounded-control font-mono text-[11px] font-normal"
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
                No write scopes. InsightOps never creates work items, queues builds, or comments on
                PRs.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-landing-hairline">
        <div className={cn(SHELL, "py-20 sm:py-24")}>
          <Reveal>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              FAQ
            </h2>
          </Reveal>
          <Accordion type="single" collapsible className="mt-8 w-full max-w-3xl">
            {FAQ.map((item, i) => (
              <AccordionItem key={item.question} value={`faq-${i}`}>
                <AccordionTrigger className="text-[15px] text-foreground">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden border-t border-landing-hairline bg-landing-surface">
        <div
          className="landing-dot-grid pointer-events-none absolute inset-0 opacity-[0.08]"
          aria-hidden="true"
        />
        <div className={cn(SHELL, "relative py-20 sm:py-24")}>
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {CLOSING.title}
          </h2>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg" className={cn("h-10", AZURE_CTA)}>
              <Link to="/signup">Get started</Link>
            </Button>
            <button
              type="button"
              onClick={onOpenDemo}
              className="text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              Watch the demo video
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-landing-hairline">
      <div className={cn(SHELL, "grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3")}>
        <div>
          <div className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="size-6" width={24} height={24} />
            <span className="text-sm font-semibold text-foreground">InsightOps</span>
          </div>
          <p className="mt-3 max-w-[32ch] text-sm text-muted-foreground">
            Azure DevOps monitoring for engineering teams.
          </p>
        </div>
        <div>
          <p className="text-[13px] font-medium text-foreground">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
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
              <Link
                to="/signin"
                className="hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                to="/signup"
                className="hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                Sign up
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-landing-hairline">
        <p className={cn(SHELL, "py-6 text-[13px] text-muted-foreground")}>InsightOps</p>
      </div>
    </footer>
  );
}
