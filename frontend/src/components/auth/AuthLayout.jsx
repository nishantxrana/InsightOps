import { Link, Outlet } from "react-router-dom";
import { AuthDotField } from "./AuthDotField";
import { AuthThemeToggle } from "./AuthThemeToggle";

/**
 * Persistent auth shell — panel stays mounted across /signin, /signup, OTP, reset.
 */
export default function AuthLayout() {
  return (
    <div className="landing relative min-h-screen bg-landing-canvas text-foreground">
      <div className="absolute right-4 top-4 z-30">
        <AuthThemeToggle />
      </div>

      <div className="grid min-h-screen lg:grid-cols-2 min-[1440px]:grid-cols-[45fr_55fr]">
        {/* Form column */}
        <div className="flex min-h-screen flex-col px-6 lg:px-0">
          <div className="shrink-0 pt-8 lg:px-8">
            <Link
              to="/"
              className="inline-flex w-fit items-center gap-2.5 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure-500/40"
            >
              <img src="/icon.svg" alt="" className="size-7" />
              <span className="text-[15px] font-semibold tracking-tight">InsightOps</span>
            </Link>
          </div>

          <div className="flex flex-1 flex-col justify-center py-10">
            <div className="mx-auto w-full max-w-[400px] lg:min-w-[360px]">
              <Outlet />
            </div>
          </div>

          <p className="shrink-0 pb-8 text-[12px] text-muted-foreground lg:px-8">
            Azure DevOps monitoring for engineering teams.
          </p>
        </div>

        {/* Living-dot panel — persists across auth routes */}
        <aside
          className="relative hidden min-h-screen overflow-hidden border-l border-landing-hairline bg-landing-surface lg:block"
          aria-hidden="true"
        >
          <AuthDotField />
          <div className="pointer-events-none absolute bottom-8 left-8 z-10 max-w-xs">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              InsightOps
            </p>
            <p className="mt-1.5 text-[15px] leading-snug text-muted-foreground">
              Clarity for engineering teams.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Shared title block used on every auth step */
export function AuthHeader({ eyebrow, title, subtitle }) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-[28px] font-semibold tracking-tight text-foreground">{title}</h1>
      {subtitle ? (
        <div className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{subtitle}</div>
      ) : null}
    </header>
  );
}
