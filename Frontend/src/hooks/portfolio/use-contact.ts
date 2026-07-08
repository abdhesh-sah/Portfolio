import { api } from "#shared";
import type { InsertMessage } from "#shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "#src/hooks/use-toast";
import { API_BASE_URL } from "#src/lib/api-helpers";
import { fetchAndParse } from "./_fetch-helper";
import { QUERY_KEYS } from "#src/lib/query-keys";

export function useMessages(limit: number = 100) {
  return useQuery({
    queryKey: [...QUERY_KEYS.messages.all, limit],
    queryFn: () =>
      fetchAndParse(
        `${api.messages.list.path}?limit=${limit}`,
        api.messages.list.responses[200],
        "Failed to fetch messages"
      ),
    staleTime: 0, // Instant update for admin
  });
}

export function useSendMessage() {
  const { toast } = useToast();

  return useMutation({
    mutationKey: ["send-message"],

    mutationFn: async ({ data, attachment }: { data: InsertMessage; attachment?: File | null }) => {
      const url = `${API_BASE_URL}${api.messages.create.path}`;

      let body: RequestInit["body"];
      let headers: HeadersInit | undefined;

      if (attachment) {
        const formData = new FormData();
        formData.append("name", data.name);
        formData.append("email", data.email);
        formData.append("subject", data.subject || "");
        formData.append("message", data.message);
        if (data.projectType) formData.append("projectType", data.projectType);
        if (data.budget) formData.append("budget", data.budget);
        if (data.timeline) formData.append("timeline", data.timeline);
        if (data._bnt_id) formData.append("_bnt_id", data._bnt_id);
        formData.append("attachment", attachment);
        body = formData;
      } else {
        body = JSON.stringify(data);
        headers = {
          "Content-Type": "application/json",
        };
      }

      const res = await fetch(url, {
        method: api.messages.create.method,
        headers,
        credentials: 'include',
        body,
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message ?? "Validation failed");
        }
        if (res.status === 413) {
          throw new Error("File too large. Maximum size is 5MB.");
        }

        throw new Error(`Request failed (${res.status})`);
      }

      return api.messages.create.responses[201].parse(await res.json());
    },

    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "I'll get back to you soon.",
      });
    },

    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
