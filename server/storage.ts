import { db } from "./db";
import {
  polls,
  options,
  votes,
  type CreatePollRequest,
  type PollWithOptions,
  type VoteRequest,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

export interface IStorage {
  createPoll(poll: CreatePollRequest): Promise<string>;
  getPoll(id: string): Promise<PollWithOptions | undefined>;
  addVote(pollId: string, voteReq: VoteRequest, ipAddress: string): Promise<boolean>;
  hasVoted(pollId: string, voterToken: string, ipAddress: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // ================================
  // CREATE POLL
  // ================================
  async createPoll(req: CreatePollRequest): Promise<string> {
    const pollId = nanoid(10);

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

  // ================================
  // GET POLL
  // ================================
  async getPoll(id: string): Promise<PollWithOptions | undefined> {
    const poll = await db
      .select()
      .from(polls)
      .where(eq(polls.id, id))
      .limit(1);

    if (!poll.length) return undefined;

    const pollOptions = await db
      .select()
      .from(options)
      .where(eq(options.pollId, id))
      .orderBy(options.id);

    return {
      ...poll[0],
      options: pollOptions,
    };
  }

  // ================================
  // CHECK IF USER ALREADY VOTED
  // ================================
  async hasVoted(
    pollId: string,
    voterToken: string,
    ipAddress: string
  ): Promise<boolean> {
    // Mechanism 1: Voter Token (browser-based)
    const tokenVote = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.pollId, pollId),
          eq(votes.voterToken, voterToken)
        )
      )
      .limit(1);

    if (tokenVote.length > 0) return true;

    // Mechanism 2: IP Address
    const ipVote = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.pollId, pollId),
          eq(votes.ipAddress, ipAddress)
        )
      )
      .limit(1);

    return ipVote.length > 0;
  }

  // ================================
  // ADD VOTE (WITH FULL RACE PROTECTION)
  // ================================
  async addVote(
    pollId: string,
    voteReq: VoteRequest,
    ipAddress: string
  ): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // Double-check inside transaction (race-condition safety)

      const existing = await tx
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.pollId, pollId),
            eq(votes.voterToken, voteReq.voterToken)
          )
        )
        .limit(1);

      if (existing.length > 0) return false;

      const existingIp = await tx
        .select()
        .from(votes)
        .where(
          and(
            eq(votes.pollId, pollId),
            eq(votes.ipAddress, ipAddress)
          )
        )
        .limit(1);

      if (existingIp.length > 0) return false;

      // Ensure option exists & belongs to poll
      const currentOption = await tx
        .select()
        .from(options)
        .where(eq(options.id, voteReq.optionId))
        .limit(1);

      if (!currentOption.length) {
        throw new Error("Option not found");
      }

      if (currentOption[0].pollId !== pollId) {
        throw new Error("Option does not belong to this poll");
      }

      // Insert vote record
      await tx.insert(votes).values({
        pollId,
        optionId: voteReq.optionId,
        voterToken: voteReq.voterToken,
        ipAddress,
      });

      // 🔥 ATOMIC INCREMENT (FIXED)
      // Atomic increment ensures no vote is lost under concurrent requests
      await tx
        .update(options)
        .set({
          count: sql`${options.count} + 1`,
        })
        .where(eq(options.id, voteReq.optionId));

      return true;
    });
  }
}

export const storage = new DatabaseStorage();