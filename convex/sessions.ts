import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { QUESTION_SETS } from "./questions";
import { getAuthUserId } from "@convex-dev/auth/server";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const getQuestionSets = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    const defaultSets = QUESTION_SETS.map((set) => ({
      id: set.id,
      name: set.name,
      description: set.description,
      questionCount: set.questions.length,
      isCustom: false,
      isOwner: false,
    }));

    if (!userId) {
      return defaultSets;
    }

    const customSets = await ctx.db
      .query("questionSets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const customSetsMapped = customSets.map((set) => ({
      id: set._id,
      name: set.name,
      description: set.description,
      questionCount: set.questions.length,
      isCustom: true,
      isOwner: true,
    }));

    return [...customSetsMapped, ...defaultSets];
  },
});

export const createSession = mutation({
  args: {
    questionSetId: v.string(),
  },
  handler: async (ctx, args) => {
    let questions;
    
    const defaultSet = QUESTION_SETS.find((set) => set.id === args.questionSetId);
    if (defaultSet) {
      questions = defaultSet.questions;
    } else {
      const customSet = await ctx.db.get(args.questionSetId as any);
      if (!customSet || !("questions" in customSet)) {
        throw new Error("Question set not found");
      }
      questions = customSet.questions;
    }

    let roomCode = generateRoomCode();
    let existing = await ctx.db
      .query("sessions")
      .withIndex("by_room_code", (q) => q.eq("roomCode", roomCode))
      .first();

    while (existing) {
      roomCode = generateRoomCode();
      existing = await ctx.db
        .query("sessions")
        .withIndex("by_room_code", (q) => q.eq("roomCode", roomCode))
        .first();
    }

    const sessionId = await ctx.db.insert("sessions", {
      status: "waiting",
      questions,
      roomCode,
      questionSetId: args.questionSetId,
    });

    return sessionId;
  },
});

export const getSession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const getSessionByRoomCode = query({
  args: { roomCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_room_code", (q) => q.eq("roomCode", args.roomCode.toUpperCase()))
      .first();
  },
});

export const startGame = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, { status: "active" });
  },
});

export const endGame = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, { status: "ended" });
  },
});

export const getLeaderboard = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const players = await ctx.db
      .query("players")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const session = await ctx.db.get(args.sessionId);
    if (!session) return [];

    const totalQuestions = session.questions.length;

    const leaderboard = await Promise.all(
      players.map(async (player) => {
        const answers = await ctx.db
          .query("answers")
          .withIndex("by_session_and_player", (q) =>
            q.eq("sessionId", args.sessionId).eq("playerId", player._id)
          )
          .collect();

        const correctAnswers = answers.filter((a) => a.isCorrect);
        const correctCount = correctAnswers.length;
        const totalTime = correctAnswers.reduce((sum, a) => {
          const questionStartTime = player.joinedAt;
          const previousAnswers = answers.filter(
            (prev) => prev.questionIndex < a.questionIndex && prev.submittedAt < a.submittedAt
          );
          const lastAnswerTime = previousAnswers.length > 0
            ? Math.max(...previousAnswers.map((p) => p.submittedAt))
            : questionStartTime;
          return sum + (a.submittedAt - lastAnswerTime);
        }, 0);

        const answeredQuestions = new Set(answers.map((a) => a.questionIndex)).size;

        return {
          playerId: player._id,
          name: player.name,
          correctCount,
          totalTime,
          questionsAnswered: answeredQuestions,
          totalQuestions,
        };
      })
    );

    leaderboard.sort((a, b) => {
      if (b.correctCount !== a.correctCount) {
        return b.correctCount - a.correctCount;
      }
      return a.totalTime - b.totalTime;
    });

    return leaderboard;
  },
});

export const createQuestionSet = mutation({
  args: { name: v.string(), description: v.string(), questions: v.array(v.object({ question: v.string(), answer: v.number() })) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");
    return await ctx.db.insert("questionSets", { userId, ...args, isPublic: false });
  },
});

export const deleteQuestionSet = mutation({
  args: { questionSetId: v.id("questionSets") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Must be logged in");
    const set = await ctx.db.get(args.questionSetId);
    if (!set || set.userId !== userId) throw new Error("Not authorized");
    await ctx.db.delete(args.questionSetId);
  },
});
