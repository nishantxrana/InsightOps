import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, Search } from "lucide-react";
import { useHealth } from "../contexts/HealthContext";
import { useTheme } from "../contexts/ThemeContext";
import { DevOpsAppSidebar } from "./DevOpsAppSidebar";
import { CommandPalette } from "./CommandPalette";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { getRouteByPath } from "@/config/routes";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function SidebarWrapper({ children }) {
  const { open } = useSidebar();

  useEffect(() => {
    localStorage.setItem("sidebar-open", JSON.stringify(open));
  }, [open]);

  return children;
}

function ConnectionStatus() {
  const { isConnected, isChecking, checkConnection } = useHealth();

  const label = isChecking ? "Checking..." : isConnected ? "API connected" : "API unreachable";

  const dotClass = isChecking ? "bg-info animate-pulse" : isConnected ? "bg-success" : "bg-danger";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={checkConnection}
          className="flex items-center gap-2 rounded-control px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={label}
        >
          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} aria-hidden />
          <span className="hidden lg:inline font-medium">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">
          InsightOps API health, checked every 5 minutes. Azure DevOps connectivity is tested in
          Settings &gt; Organizations.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleThemeToggle = (event) => {
    if (isAnimating) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      toggleTheme();
      return;
    }

    setIsAnimating(true);
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const ripple = document.createElement("div");
    ripple.className = "theme-ripple";
    ripple.style.cssText = `
      top: ${y}px;
      left: ${x}px;
      width: 20px;
      height: 20px;
      color: hsl(var(--background));
    `;

    document.body.classList.add("theme-transitioning");
    document.body.appendChild(ripple);

    button.style.transform = "scale(0.95)";
    setTimeout(() => {
      button.style.transform = "";
    }, 150);

    setTimeout(() => {
      toggleTheme();
    }, 200);

    setTimeout(() => {
      if (ripple.parentNode) {
        document.body.removeChild(ripple);
      }
      document.body.classList.remove("theme-transitioning");
      setIsAnimating(false);
    }, 800);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleThemeToggle}
          disabled={isAnimating}
          className="flex h-8 w-8 items-center justify-center rounded-control text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-sm">Switch to {theme === "dark" ? "light" : "dark"} mode</p>
      </TooltipContent>
    </Tooltip>
  );
}

function LayoutChrome({ children }) {
  const location = useLocation();
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const currentRoute = getRouteByPath(location.pathname);
  const currentPageName = currentRoute?.label || "Page";

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-control focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:outline-none focus:ring-1 focus:ring-ring"
      >
        Skip to content
      </a>
      <DevOpsAppSidebar />
      <SidebarInset>
        <header
          role="banner"
          className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <Link to="/dashboard">InsightOps</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentPageName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <div className="ml-auto flex items-center gap-1 px-4 sm:gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="flex h-8 items-center gap-2 rounded-control border border-border bg-muted/40 px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Open command palette"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Search</span>
                  <kbd className="pointer-events-none hidden h-5 select-none items-center gap-0.5 rounded border border-border bg-background px-1.5 font-sans text-[10px] text-muted-foreground sm:inline-flex">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Command palette (Ctrl/Cmd+K)</p>
              </TooltipContent>
            </Tooltip>

            <ConnectionStatus />
            <ThemeToggle />
          </div>
        </header>

        <main id="main-content" className="flex flex-1 flex-col overflow-hidden" tabIndex={-1}>
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">{children}</div>
        </main>
      </SidebarInset>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

export default function Layout({ children }) {
  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={JSON.parse(localStorage.getItem("sidebar-open") ?? "true")}>
        <SidebarWrapper>
          <LayoutChrome>{children}</LayoutChrome>
        </SidebarWrapper>
      </SidebarProvider>
    </TooltipProvider>
  );
}
