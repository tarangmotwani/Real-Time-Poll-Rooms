import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === TABLE DEFINITIONS ===

export const polls = pgTable("polls", {
  id: text("id").primaryKey(), // Using nanoid/uuid for shareable links
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const options = pgTable("options", {
  id: serial("id").primaryKey(),
  pollId: text("poll_id").notNull(), // Foreign key to polls.id
  text: text("text").notNull(),
  count: integer("count").default(0).notNull(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  pollId: text("poll_id").notNull(),
  optionId: integer("option_id").notNull(),
  voterToken: text("voter_token").notNull(), // Client-generated ID stored in localStorage
  ipAddress: text("ip_address"), // Server-captured IP for second layer of fairness
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===

export const pollsRelations = relations(polls, ({ many }) => ({
  options: many(options),
  votes: many(votes),
}));

export const optionsRelations = relations(options, ({ one }) => ({
  poll: one(polls, {
    fields: [options.pollId],
    references: [polls.id],
  }),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  poll: one(polls, {
    fields: [votes.pollId],
    references: [polls.id],
  }),
  option: one(options, {
    fields: [votes.optionId],
    references: [options.id],
  }),
}));

// === BASE SCHEMAS ===

// Input schema for creating a poll
export const createPollSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  options: z.array(z.string().min(1, "Option cannot be empty")).min(2, "At least 2 options are required"),
});

// Input schema for voting
export const voteSchema = z.object({
  optionId: z.number(),
  voterToken: z.string().min(1),
});

// === TYPES ===

export type Poll = typeof polls.$inferSelect;
export type Option = typeof options.$inferSelect;
export type Vote = typeof votes.$inferSelect;

export type CreatePollRequest = z.infer<typeof createPollSchema>;
export type VoteRequest = z.infer<typeof voteSchema>;

// Response type including options
export type PollWithOptions = Poll & {
  options: Option[];
};

// WebSocket Event Types
export const WS_EVENTS = {
  VOTE_UPDATE: 'vote_update', // Broadcast updated poll counts
} as const;

export interface VoteUpdatePayload {
  pollId: string;
  optionId: number;
  newCount: number;
  totalVotes: number;
}
