import { api, type Project } from "#shared";
import { useQuery } from "@tanstack/react-query";
import { fetchAndParse } from "./_fetch-helper";
import { QUERY_KEYS } from "#src/lib/query-keys";
import { usePersona } from "../use-persona";

import seedData from "../../../../Backend/src/seed-data.json";

export function useProjects(sortBy: string = "default") {
  const { isDevMode } = usePersona();

  const query = useQuery({
    queryKey: [...QUERY_KEYS.projects.list(sortBy), isDevMode],
    queryFn: async () => {
      const projects = await fetchAndParse(
        `${api.projects.list.path}${sortBy !== "default" ? `?sort=${sortBy}` : ""}${isDevMode ? `${sortBy !== "default" ? "&" : "?"}secret=revealed` : ""}`,
        api.projects.list.responses[200],
        "Failed to fetch projects"
      ) as Project[];
      return projects;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    ...query,
    data: query.data || (seedData.projects as unknown as Project[]),
  };
}

export function useProjectById(id: number | null) {
  return useQuery({
    queryKey: QUERY_KEYS.projects.detail(id),
    queryFn: () =>
      fetchAndParse(
        api.projects.get.path.replace(":id", id?.toString() || ""),
        api.projects.get.responses[200],
        "Failed to fetch project"
      ),
    enabled: !!id && id > 0,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProjectVitals() {
  return useQuery({
    queryKey: ["projects", "vitals"],
    queryFn: async () => {
      const response = await fetch("/api/v1/projects/vitals");
      if (!response.ok) throw new Error("Failed to fetch project vitals");
      return response.json() as Promise<Record<string, "up" | "down" | "checking" | "none">>;
    },
    refetchInterval: 1000 * 60 * 10, // Refetch every 10 minutes
    staleTime: 1000 * 60 * 5,
  });
}
