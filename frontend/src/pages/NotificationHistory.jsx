import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";

import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/kit/EmptyState";
import { InlineError } from "@/components/kit/InlineError";
import { PageHeader } from "@/components/kit/PageHeader";
import { SkeletonRows } from "@/components/kit/Skeletons";
import { StatusBadge } from "@/components/kit/StatusBadge";
import {
  ActiveFilters,
  ResultCount,
  SearchField,
  SegmentedFilter,
  SortSelect,
  Toolbar,
} from "@/components/kit/Toolbar";
import { useAuth } from "@/contexts/AuthContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { useSearchParamState } from "@/hooks/useSearchParamState";
import { useToast } from "@/hooks/use-toast";
import { exportNotificationToCSV } from "@/utils/csvExport";

import { SORT_OPTIONS, TYPE_LABELS, TYPE_VALUES } from "./notifications/constants";
import {
  countForType,
  emptyDescriptionForType,
  hasLoadedFailures,
  normalizeTypeParam,
} from "./notifications/helpers";
import { NotificationItem } from "./notifications/NotificationItem";

const NotificationHistory = () => {
  const { user } = useAuth();
  const { currentOrganization, currentProject, clearSwitching } = useOrganization();
  const { toast } = useToast();

  const [typeParam, setTypeParam] = useSearchParamState("type", "all");
  const activeTab = normalizeTypeParam(typeParam);

  const [notifications, setNotifications] = useState([]);
  const [counts, setCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (typeParam !== activeTab) {
      setTypeParam(activeTab);
    }
  }, [typeParam, activeTab, setTypeParam]);

  const getHeaders = useCallback(() => {
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "Content-Type": "application/json",
    };
    if (currentOrganization?._id) {
      headers["X-Organization-ID"] = currentOrganization._id;
    }
    return headers;
  }, [currentOrganization?._id]);

  const fetchCounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/counts`, {
        headers: getHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCounts(data);
    } catch {
      setCounts({});
    }
  }, [getHeaders]);

  const fetchNotifications = useCallback(
    async (loadMore = false) => {
      try {
        if (loadMore) {
          setLoadingMore(true);
          setLoadMoreError(null);
        } else {
          setLoading(true);
          setPage(0);
          setNotifications([]);
          setError(null);
          setLoadMoreError(null);
        }

        const currentPage = loadMore ? page + 1 : 0;
        const limit = 20;
        const params = new URLSearchParams({
          limit: String(limit),
          skip: String(currentPage * limit),
        });
        if (activeTab !== "all") {
          params.append("type", activeTab);
        }

        const response = await fetch(`/api/notifications?${params}`, {
          headers: getHeaders(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (loadMore) {
          setNotifications((prev) => [...prev, ...data]);
          setPage(currentPage);
        } else {
          setNotifications(data);
        }

        setHasMore(data.length === limit);
      } catch (err) {
        const userMessage =
          err.userMessage || err.message || "Failed to load notifications. Please try again.";
        if (loadMore) {
          setLoadMoreError(userMessage);
        } else {
          setError(userMessage);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        clearSwitching();
      }
    },
    [activeTab, clearSwitching, getHeaders, page]
  );

  useEffect(() => {
    const userId = user?._id || user?.id;
    if (userId && currentOrganization?._id) {
      fetchNotifications(false);
      fetchCounts();
    } else {
      setLoading(false);
      clearSwitching();
    }
    // Refetch when tab, org, or project changes (project does not alter request headers).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: remount-style refetch on those deps
  }, [user, activeTab, currentOrganization, currentProject]);

  const handleExport = useCallback(
    (notification) => {
      const result = exportNotificationToCSV(notification);
      if (!result?.ok) {
        toast({
          title: "Export failed",
          description: result?.error || "Could not export CSV",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const filteredNotifications = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return notifications
      .filter((n) => {
        if (!q) return true;
        const title = (n.title || "").toLowerCase();
        const message = (n.message || "").toLowerCase();
        return title.includes(q) || message.includes(q);
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [notifications, searchQuery, sortOrder]);

  const segmentOptions = useMemo(
    () =>
      TYPE_VALUES.map((value) => ({
        value,
        label: TYPE_LABELS[value],
        count: countForType(counts, value),
      })),
    [counts]
  );

  const activeChips = useMemo(() => {
    const chips = [];
    if (activeTab !== "all") {
      chips.push({ id: "type", label: TYPE_LABELS[activeTab] || activeTab });
    }
    if (searchQuery.trim()) {
      chips.push({ id: "search", label: `Search: ${searchQuery.trim()}` });
    }
    return chips;
  }, [activeTab, searchQuery]);

  const clearFilters = (id) => {
    if (!id || id === "type") setTypeParam("all");
    if (!id || id === "search") setSearchQuery("");
  };

  const attentionCount = (counts.overdue || 0) + (counts["idle-pr"] || 0);

  const headerStatus = (() => {
    if (loading || !(counts.total > 0)) return null;
    if (attentionCount > 0) {
      return <StatusBadge tone="warning" label={`${attentionCount} need attention`} />;
    }
    if (hasLoadedFailures(notifications)) {
      return <StatusBadge tone="danger" label="Has failures" />;
    }
    return <StatusBadge tone="success" label="All clear" />;
  })();

  const description =
    !loading && counts.total > 0
      ? `${counts.total} notification${counts.total !== 1 ? "s" : ""} from the last 7 days`
      : "Alerts from the last 7 days";

  const emptyTitle = searchQuery.trim()
    ? "No matching notifications"
    : "No notifications in the last 7 days";

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader title="Notifications" description={description} status={headerStatus} />

      <div className="space-y-2">
        <Toolbar className="lg:flex-nowrap">
          <div className="flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-2">
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setTypeParam}>
                <SelectTrigger className="w-full" aria-label="Notification type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {segmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                      {typeof opt.count === "number" && opt.count > 0 ? ` (${opt.count})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden min-w-0 sm:block">
              <SegmentedFilter
                className="h-auto max-w-full flex-wrap"
                options={segmentOptions}
                value={activeTab}
                onChange={setTypeParam}
              />
            </div>
            <SearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search notifications..."
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SortSelect value={sortOrder} onChange={setSortOrder} options={SORT_OPTIONS} />
            <ResultCount
              shown={filteredNotifications.length}
              total={notifications.length}
              noun="notifications"
            />
          </div>
        </Toolbar>
        <ActiveFilters chips={activeChips} onClear={clearFilters} />
      </div>

      {error ? <InlineError message={error} onRetry={() => fetchNotifications(false)} /> : null}

      {loading ? (
        <SkeletonRows rows={6} columns={3} />
      ) : !error && filteredNotifications.length === 0 ? (
        <EmptyState
          icon={<Bell />}
          title={emptyTitle}
          description={
            searchQuery.trim()
              ? "Try adjusting your search terms."
              : emptyDescriptionForType(activeTab)
          }
          action={
            searchQuery.trim() ? (
              <Button type="button" variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                Clear search
              </Button>
            ) : activeChips.length > 0 ? (
              <Button type="button" variant="outline" size="sm" onClick={() => clearFilters()}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : !error ? (
        <>
          <Accordion type="single" collapsible className="space-y-2">
            {filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onExport={handleExport}
              />
            ))}
          </Accordion>

          {loadMoreError ? (
            <InlineError message={loadMoreError} onRetry={() => fetchNotifications(true)} />
          ) : null}

          {hasMore ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <ResultCount
                shown={filteredNotifications.length}
                total={notifications.length}
                noun="notifications"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchNotifications(true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load More"}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
};

export default NotificationHistory;
