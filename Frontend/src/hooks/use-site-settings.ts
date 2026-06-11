import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { apiFetch } from "#src/lib/api-helpers";
import { siteSettingsSchema } from "#shared";
import type { SiteSettings, InsertSiteSettings } from "#shared";
import { QUERY_KEYS } from "#src/lib/query-keys";

import seedData from "../../../Backend/src/seed-data.json";

export function useSiteSettings(): UseQueryResult<SiteSettings> {
    const query = useQuery<SiteSettings>({
        queryKey: QUERY_KEYS.settings(),
        queryFn: () => apiFetch("/api/v1/settings", {}, siteSettingsSchema),
        staleTime: 1000 * 60 * 5, // 5 minutes (reduced from 1 hour to ensure admin updates show quickly)
        gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
    });

    return {
        ...query,
        data: query.data || (seedData.siteSettings as unknown as SiteSettings)
    } as UseQueryResult<SiteSettings>;
}

export function useUpdateSiteSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: InsertSiteSettings) => {
            return apiFetch("/api/v1/settings", {
                method: "PATCH",
                body: JSON.stringify(data),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings() });
        },
    });
}
