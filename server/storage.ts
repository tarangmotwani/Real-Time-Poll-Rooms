import { db } from "./db";
import {
  polls,
  options,
  votes,
  type CreatePollRequest,
  type PollWithOptions,
  type VoteRequest,
  type Vote,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  createPoll(poll: CreatePollRequest): Promise<string>;
  getPoll(id: string): Promise<PollWithOptions | undefined>;
  addVote(pollId: string, voteReq: VoteRequest, ipAddress: string): Promise<boolean>;
  hasVoted(pollId: string, voterToken: string, ipAddress: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async createPoll(req: CreatePollRequest): Promise<string> {
    const pollId = nanoid(10); // Short, URL-friendly ID

    await db.transaction(async (tx) => {
      await tx.insert(polls).values({
        id: pollId,
        question: req.question,
      });

      await tx.insert(options).values(
        req.options.map((opt) => ({
          pollId: pollId,
          text: opt,
          count: 0,
        }))
      );
    });

    return pollId;
  }

  async getPoll(id: string): Promise<PollWithOptions | undefined> {
    const poll = await db.select().from(polls).where(eq(polls.id, id)).limit(1);
    if (!poll.length) return undefined;

    const pollOptions = await db
      .select()
      .from(options)
      .where(eq(options.pollId, id))
      .orderBy(options.id); // Maintain order

    return {
      ...poll[0],
      options: pollOptions,
    };
  }

  async hasVoted(pollId: string, voterToken: string, ipAddress: string): Promise<boolean> {
    // Fairness Mechanism 1: Check Voter Token (LocalStorage/Cookie based)
    const tokenVote = await db.select().from(votes).where(
      and(
        eq(votes.pollId, pollId),
        eq(votes.voterToken, voterToken)
      )
    ).limit(1);

    if (tokenVote.length > 0) return true;

    // Fairness Mechanism 2: Check IP Address (Simple anti-abuse)
    // NOTE: In a real prod app, we might allow multiple votes per IP (NAT), 
    // but for this "strict" fairness requirement, we'll flag it or limit it.
    // For this assignment, let's strictly limit 1 vote per IP per poll 
    // to satisfy the "two mechanisms" requirement robustly.
    const ipVote = await db.select().from(votes).where(
      and(
        eq(votes.pollId, pollId),
        eq(votes.ipAddress, ipAddress)
      )
    ).limit(1);
    
    return ipVote.length > 0;
  }

  async addVote(pollId: string, voteReq: VoteRequest, ipAddress: string): Promise<boolean> {
    // Double-check fairness inside the transaction to prevent race conditions
    // (though 'hasVoted' is usually called before)
    
    return await db.transaction(async (tx) => {
      const existing = await tx.select().from(votes).where(
        and(
           eq(votes.pollId, pollId),
           eq(votes.voterToken, voteReq.voterToken)
        )
      );
      
      if (existing.length > 0) return false;

      // Also check IP inside tx if we want to be strict
      const existingIp = await tx.select().from(votes).where(
        and(
          eq(votes.pollId, pollId),
          eq(votes.ipAddress, ipAddress)
        )
      );
      if (existingIp.length > 0) return false;

      // Record vote
      await tx.insert(votes).values({
        pollId,
        optionId: voteReq.optionId,
        voterToken: voteReq.voterToken,
        ipAddress: ipAddress,
      });

      // Verify option belongs to poll
      const currentOption = await tx.select().from(options).where(eq(options.id, voteReq.optionId));
      if (!currentOption.length) throw new Error("Option not found");
      if (currentOption[0].pollId !== pollId) throw new Error("Option does not belong to this poll");
      
      await tx.update(options)
        .set({ count: currentOption[0].count + 1 })
        .where(eq(options.id, voteReq.optionId));

      return true;
    });
  }
}

export const storage = new DatabaseStorage();
