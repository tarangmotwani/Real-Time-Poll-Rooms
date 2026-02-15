import type { Express } from "express";
import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { WS_EVENTS, type VoteUpdatePayload } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === WebSocket Setup ===
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const broadcastVoteUpdate = (pollId: string, optionId: number, newCount: number) => {
    const payload = JSON.stringify({
      type: WS_EVENTS.VOTE_UPDATE,
      payload: {
        pollId,
        optionId,
        newCount,
      } as VoteUpdatePayload,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // === API Routes ===

  // Create Poll
  app.post(api.polls.create.path, async (req, res) => {
    try {
      const input = api.polls.create.input.parse(req.body);
      const pollId = await storage.createPoll(input);
      res.status(201).json({ id: pollId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Get Poll
  app.get(api.polls.get.path, async (req, res) => {
    const poll = await storage.getPoll(req.params.id);
    if (!poll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    res.json(poll);
  });

  // Vote
  app.post(api.polls.vote.path, async (req, res) => {
    try {
      const pollId = req.params.id;
      const input = api.polls.vote.input.parse(req.body);
      
      // Get IP for fairness check
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

      // Check if already voted
      const hasVoted = await storage.hasVoted(pollId, input.voterToken, ip);
      if (hasVoted) {
        return res.status(409).json({ message: "You have already voted on this poll." });
      }

      // Record vote
      const success = await storage.addVote(pollId, input, ip);
      if (!success) {
        // Fallback if race condition caught it
        return res.status(409).json({ message: "Vote could not be recorded (duplicate)." });
      }

      // Fetch updated count to broadcast
      const poll = await storage.getPoll(pollId);
      const updatedOption = poll?.options.find(o => o.id === input.optionId);
      
      if (updatedOption) {
        broadcastVoteUpdate(pollId, input.optionId, updatedOption.count);
      }

      res.json({ success: true, message: "Vote recorded" });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  return httpServer;
}
