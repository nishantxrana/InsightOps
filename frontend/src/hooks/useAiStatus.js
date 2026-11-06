import { useEffect, useState } from "react";
import axios from "axios";

import { useOrganization } from "@/contexts/OrganizationContext";

/**
 * Fetch GET /api/ai/status once per organization context (cheap).
 * @returns {{ aiStatus: object | null, loading: boolean }}
 */
export function useAiStatus() {
  const { currentOrganization } = useOrganization() || {};
  const [aiStatus, setAiStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const orgId = currentOrganization?._id || currentOrganization?.id;
    if (!orgId) {
      setAiStatus(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const headers = {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
      "X-Organization-ID": orgId,
    };

    axios
      .get("/api/ai/status", { headers })
      .then((res) => {
        if (!cancelled) setAiStatus(res.data);
      })
      .catch(() => {
        if (!cancelled) setAiStatus(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentOrganization?._id, currentOrganization?.id]);

  return { aiStatus, loading };
}
