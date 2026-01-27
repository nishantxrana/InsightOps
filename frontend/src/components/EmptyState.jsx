import { Link } from "react-router-dom";
import {
  Settings,
  Cloud,
  Bell,
  GitPullRequest,
  CheckSquare,
  Rocket,
  AlertCircle,
  Info,
} from "lucide-react";

/**
 * Reusable EmptyState component with setup guidance
 *
 * @param {string} type - Type of empty state: 'no-org', 'no-azure', 'no-data', 'error'
 * @param {string} title - Custom title (optional)
 * @param {string} description - Custom description (optional)
 * @param {string} actionLabel - Custom action button label (optional)
 * @param {string} actionLink - Custom action link (optional)
 * @param {function} onAction - Custom action callback (optional)
 * @param {string} icon - Icon type: 'settings', 'cloud', 'bell', 'pr', 'work', 'release', 'error', 'info'
 */
export default function EmptyState({
  type = "no-data",
  title,
  description,
  actionLabel,
  actionLink,
  onAction,
  icon = "info",
}) {
  // Default configurations based on type
  const configs = {
    "no-org": {
      icon: "settings",
      title: "No Organization Selected",
      description: "Select an organization to view your data, or create a new one to get started.",
      actionLabel: "Go to Settings",
      actionLink: "/settings",
    },
    "no-azure": {
      icon: "cloud",
      title: "Azure DevOps Not Configured",
      description:
        "Connect your Azure DevOps organization to see your builds, work items, and pull requests.",
      actionLabel: "Configure Azure DevOps",
      actionLink: "/settings",
    },
    "no-data": {
      icon: "info",
      title: "No Data Available",
      description: "Once your Azure DevOps is connected, your data will appear here.",
      actionLabel: null,
      actionLink: null,
    },
    "no-notifications": {
      icon: "bell",
      title: "No Notifications Yet",
      description:
        "You'll receive notifications here when builds fail, PRs need attention, or work items are overdue.",
      actionLabel: "Configure Notifications",
      actionLink: "/settings",
    },
    "no-work-items": {
      icon: "work",
      title: "No Work Items in Sprint",
      description:
        "This sprint doesn't have any work items yet, or Azure DevOps needs to be configured.",
      actionLabel: "Check Settings",
      actionLink: "/settings",
    },
    "no-prs": {
      icon: "pr",
      title: "No Active Pull Requests",
      description:
        "There are no active pull requests in your project, or Azure DevOps needs to be configured.",
      actionLabel: "Check Settings",
      actionLink: "/settings",
    },
    "no-releases": {
      icon: "release",
      title: "No Recent Releases",
      description:
        "No releases found for your project. Configure your release pipelines in Azure DevOps.",
      actionLabel: "Check Settings",
      actionLink: "/settings",
    },
    error: {
      icon: "error",
      title: "Something Went Wrong",
      description: "We couldn't load your data. Please check your connection and try again.",
      actionLabel: "Try Again",
      actionLink: null,
    },
  };

  const config = configs[type] || configs["no-data"];

  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalActionLabel = actionLabel !== undefined ? actionLabel : config.actionLabel;
  const finalActionLink = actionLink !== undefined ? actionLink : config.actionLink;
  const finalIcon = icon || config.icon;

  const iconMap = {
    settings: Settings,
    cloud: Cloud,
    bell: Bell,
    pr: GitPullRequest,
    work: CheckSquare,
    release: Rocket,
    error: AlertCircle,
    info: Info,
  };

  const IconComponent = iconMap[finalIcon] || Info;

  const iconColorMap = {
    settings: "text-blue-500 dark:text-blue-400",
    cloud: "text-sky-500 dark:text-sky-400",
    bell: "text-amber-500 dark:text-amber-400",
    pr: "text-purple-500 dark:text-purple-400",
    work: "text-green-500 dark:text-green-400",
    release: "text-orange-500 dark:text-orange-400",
    error: "text-red-500 dark:text-red-400",
    info: "text-muted-foreground",
  };

  const bgColorMap = {
    settings: "bg-blue-50 dark:bg-blue-950/30",
    cloud: "bg-sky-50 dark:bg-sky-950/30",
    bell: "bg-amber-50 dark:bg-amber-950/30",
    pr: "bg-purple-50 dark:bg-purple-950/30",
    work: "bg-green-50 dark:bg-green-950/30",
    release: "bg-orange-50 dark:bg-orange-950/30",
    error: "bg-red-50 dark:bg-red-950/30",
    info: "bg-muted",
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className={`w-16 h-16 ${bgColorMap[finalIcon]} rounded-2xl flex items-center justify-center mb-4`}
      >
        <IconComponent className={`w-8 h-8 ${iconColorMap[finalIcon]}`} />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-2">{finalTitle}</h3>

      <p className="text-sm text-muted-foreground max-w-md mb-6">{finalDescription}</p>

      {finalActionLabel &&
        (finalActionLink || onAction) &&
        (finalActionLink ? (
          <Link
            to={finalActionLink}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            {finalActionLabel}
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            {finalActionLabel}
          </button>
        ))}
    </div>
  );
}
