import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "#src/lib/api-helpers";
import { QUERY_KEYS } from "#src/lib/query-keys";

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: QUERY_KEYS.analytics.summary,
    queryFn: async () => {
      return await apiFetch("/api/v1/analytics/summary");
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useVitalsSummary(days: number = 7) {
  return useQuery({
    queryKey: QUERY_KEYS.analytics.vitals(days),
    queryFn: async () => {
      return await apiFetch(`/api/v1/analytics/vitals?days=${days}`);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

