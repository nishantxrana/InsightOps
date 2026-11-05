import {
  Home,
  CheckSquare,
  GitBranch,
  Rocket,
  GitPullRequest,
  FileText,
  Bell,
  Settings,
  Building2,
  Bot,
  Webhook,
  Clock,
  Shield,
} from "lucide-react";

/** @typedef {{ path: string, label: string, group: string | null, icon: import('lucide-react').LucideIcon }} AppRoute */

/** @type {AppRoute[]} */
export const APP_ROUTES = [
  { path: "/dashboard", label: "Dashboard", group: "Overview", icon: Home },
  { path: "/work-items", label: "Work Items", group: "Development", icon: CheckSquare },
  { path: "/pipelines", label: "Pipelines", group: "Development", icon: GitBranch },
  { path: "/releases", label: "Releases", group: "Development", icon: Rocket },
  { path: "/pull-requests", label: "Pull Requests", group: "Development", icon: GitPullRequest },
  { path: "/notifications", label: "Notifications", group: "Operations", icon: Bell },
  { path: "/logs", label: "Logs", group: "Operations", icon: FileText },
  { path: "/settings", label: "Settings", group: null, icon: Settings },
];

export const NAV_GROUP_ORDER = ["Overview", "Development", "Operations"];

/** Routes shown in the sidebar main nav (excludes Settings). */
export const NAV_ROUTES = APP_ROUTES.filter((r) => r.group != null);

/** Settings footer route. */
export const SETTINGS_ROUTE = APP_ROUTES.find((r) => r.path === "/settings");

/** Grouped nav items for the sidebar. */
export function getNavGroups() {
  return NAV_GROUP_ORDER.map((title) => ({
    title,
    items: NAV_ROUTES.filter((r) => r.group === title).map((r) => ({
      title: r.label,
      url: r.path,
      icon: r.icon,
    })),
  }));
}

/**
 * Prefix match: `/pull-requests` stays active on sub-paths.
 * Longer paths win when multiple match.
 */
export function getRouteByPath(pathname) {
  if (!pathname) return null;
  const normalized = pathname === "/" ? "/dashboard" : pathname;
  const matches = APP_ROUTES.filter(
    (r) => normalized === r.path || normalized.startsWith(`${r.path}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, r) => (r.path.length > best.path.length ? r : best));
}

export function isRouteActive(pathname, path) {
  if (!pathname || !path) return false;
  const normalized = pathname === "/" ? "/dashboard" : pathname;
  return normalized === path || normalized.startsWith(`${path}/`);
}

/** Settings deep-link sections for command palette (ids match Settings.jsx). */
export const SETTINGS_SECTIONS = [
  { id: "organizations", label: "Organizations", icon: Building2 },
  { id: "ai", label: "AI Configuration", icon: Bot },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "webhooks", label: "Webhook URLs", icon: Webhook },
  { id: "polling", label: "Polling", icon: Clock },
  { id: "security", label: "Security", icon: Shield },
];
