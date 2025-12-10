import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const joinSession = mutation({
  args: {
    sessionId: v.id("sessions"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "waiting") {
      throw new Error("Game has already started");
    }

    const playerId = await ctx.db.insert("players", {
      sessionId: args.sessionId,
      name: args.name,
      joinedAt: Date.now(),
    });

    return playerId;
  },
});

export const getPlayer = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.playerId);
  },
});

export const submitAnswer = mutation({
  args: {
    playerId: v.id("players"),
    questionIndex: v.number(),
    answer: v.number(),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    const session = await ctx.db.get(player.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.status !== "active") {
      throw new Error("Game is not active");
    }

    const correctAnswer = session.questions[args.questionIndex].answer;
    const isCorrect = args.answer === correctAnswer;

    await ctx.db.insert("answers", {
      sessionId: player.sessionId,
      playerId: args.playerId,
      questionIndex: args.questionIndex,
      answer: args.answer,
      isCorrect,
      submittedAt: Date.now(),
    });

    return { isCorrect };
  },
});

export const getPlayerAnswers = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return [];

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    return answers;
  },
});

export const getPlayerProgress = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;

    const session = await ctx.db.get(player.sessionId);
    if (!session) return null;

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    const answeredQuestions = new Set(answers.map((a) => a.questionIndex));
    const correctAnswers = answers.filter((a) => a.isCorrect);

    return {
      session,
      answeredQuestions: Array.from(answeredQuestions),
      correctCount: correctAnswers.length,
      totalQuestions: session.questions.length,
    };
  },
});
