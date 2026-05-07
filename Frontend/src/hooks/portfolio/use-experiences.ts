import { api, type Experience } from "#shared";
import { useQuery } from "@tanstack/react-query";
import { fetchAndParse } from "./_fetch-helper";
import { QUERY_KEYS } from "#src/lib/query-keys";

import seedData from "../../../../Backend/src/seed-data.json";

export function useExperiences() {
  const query = useQuery({
    queryKey: QUERY_KEYS.experiences.all,
    queryFn: () =>
      fetchAndParse(
        api.experiences.list.path,
        api.experiences.list.responses[200],
        "Failed to fetch experiences"
      ),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...query,
    data: query.data || (seedData.experiences as unknown as Experience[]),
  };
}
