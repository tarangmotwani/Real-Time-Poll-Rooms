import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import useWebSocket from "react-use-websocket";
import { useEffect } from "react";
import { WS_EVENTS, type VoteUpdatePayload } from "@shared/schema";
import type { PollWithOptions, CreatePollRequest, VoteRequest } from "@shared/schema";

// Get protocol dynamically (wss for https, ws for http)
const getSocketUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws`;
};

// Hook for real-time poll updates
export function usePollSocket(pollId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { lastJsonMessage } = useWebSocket(getSocketUrl(), {
    shouldReconnect: () => true,
    reconnectInterval: 3000,
  });

  useEffect(() => {
    if (!lastJsonMessage || !pollId) return;

    const message = lastJsonMessage as { type: string; payload: any };

    if (message.type === WS_EVENTS.VOTE_UPDATE) {
      const payload = message.payload as VoteUpdatePayload;
      
      // Only update if it matches current poll
      if (payload.pollId === pollId) {
        // Optimistically update the query cache without refetching
        queryClient.setQueryData<PollWithOptions>([api.polls.get.path, pollId], (oldData) => {
          if (!oldData) return oldData;

          const updatedOptions = oldData.options.map(opt => {
            if (opt.id === payload.optionId) {
              return { ...opt, count: payload.newCount };
            }
            return opt;
          });

          return {
            ...oldData,
            options: updatedOptions
          };
        });
      }
    }
  }, [lastJsonMessage, pollId, queryClient]);
}

// Hook to fetch a single poll
export function usePoll(id: string) {
  return useQuery({
    queryKey: [api.polls.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.polls.get.path, { id });
      const res = await fetch(url);
      
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch poll");
      
      const data = await res.json();
      return api.polls.get.responses[200].parse(data);
    },
    enabled: !!id,
  });
}

// Hook to create a poll
export function useCreatePoll() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: CreatePollRequest) => {
      // Validate with Zod before sending
      const validated = api.polls.create.input.parse(data);
      
      const res = await fetch(api.polls.create.path, {
        method: api.polls.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create poll");
      }

      return api.polls.create.responses[201].parse(await res.json());
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating poll",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Hook to vote on a poll
export function useVote(pollId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: VoteRequest) => {
      const url = buildUrl(api.polls.vote.path, { id: pollId });
      
      const res = await fetch(url, {
        method: api.polls.vote.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit vote");
      }

      return api.polls.vote.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      // Invalidate to ensure consistency, though socket handles real-time
      queryClient.invalidateQueries({ queryKey: [api.polls.get.path, pollId] });
      toast({
        title: "Vote recorded!",
        description: "Thanks for participating.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Couldn't vote",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
