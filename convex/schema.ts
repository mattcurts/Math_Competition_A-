import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  questionSets: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    questions: v.array(v.object({
      question: v.string(),
      answer: v.number(),
    })),
    isPublic: v.boolean(),
  }).index("by_user", ["userId"]),

  sessions: defineTable({
    status: v.union(v.literal("waiting"), v.literal("active"), v.literal("ended")),
    questions: v.array(v.object({
      question: v.string(),
      answer: v.number(),
    })),
    roomCode: v.optional(v.string()),
    questionSetId: v.optional(v.string()),
  }).index("by_room_code", ["roomCode"]),

  players: defineTable({
    sessionId: v.id("sessions"),
    name: v.string(),
    joinedAt: v.number(),
  }).index("by_session", ["sessionId"]),

  answers: defineTable({
    sessionId: v.id("sessions"),
    playerId: v.id("players"),
    questionIndex: v.number(),
    answer: v.number(),
    isCorrect: v.boolean(),
    submittedAt: v.number(),
  })
    .index("by_session_and_player", ["sessionId", "playerId"])
    .index("by_player", ["playerId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
