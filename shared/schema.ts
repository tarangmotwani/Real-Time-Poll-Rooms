import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { z } from "zod";

// ==============================
// TABLE DEFINITIONS
// ==============================

export const polls = pgTable("polls", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Options table
export const options = pgTable(
  "options",
  {
    id: serial("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    count: integer("count").default(0).notNull(),
  },
  (table) => ({
    pollIndex: index("options_poll_idx").on(table.pollId),
  })
);

// Votes table
export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: integer("option_id")
      .notNull()
      .references(() => options.id, { onDelete: "cascade" }),
    voterToken: text("voter_token").notNull(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // 🔥 FAIRNESS ENFORCEMENT AT DATABASE LEVEL
    // Unique indexes enforce fairness at the database level
    uniqueTokenPerPoll: uniqueIndex("unique_token_per_poll")
      .on(table.pollId, table.voterToken),

    uniqueIpPerPoll: uniqueIndex("unique_ip_per_poll")
      .on(table.pollId, table.ipAddress),

    pollIndex: index("votes_poll_idx").on(table.pollId),
  })
);

// ==============================
// RELATIONS
// ==============================

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

// ==============================
// INPUT SCHEMAS
// ==============================

export const createPollSchema = z.object({
  question: z
    .string()
    .min(5, "Question must be at least 5 characters")
    .max(500),
  options: z
    .array(z.string().min(1, "Option cannot be empty"))
    .min(2, "At least 2 options are required"),
});

export const voteSchema = z.object({
  optionId: z.number().int().positive(),
  voterToken: z.string().min(1),
});

// ==============================
// TYPES
// ==============================

export type Poll = typeof polls.$inferSelect;
export type Option = typeof options.$inferSelect;
export type Vote = typeof votes.$inferSelect;

export type CreatePollRequest = z.infer<typeof createPollSchema>;
export type VoteRequest = z.infer<typeof voteSchema>;

export type PollWithOptions = Poll & {
  options: Option[];
};

// ==============================
// WEBSOCKET EVENT TYPES
// ==============================

export const WS_EVENTS = {
  VOTE_UPDATE: "vote_update",
} as const;

export interface VoteUpdatePayload {
  pollId: string;
  optionId: number;
  newCount: number;
  totalVotes: number;
}