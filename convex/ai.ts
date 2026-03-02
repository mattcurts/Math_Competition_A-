"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import Anthropic from "@anthropic-ai/sdk";

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "very easy (difficulty 1/5)",
  2: "easy (difficulty 2/5)",
  3: "medium (difficulty 3/5)",
  4: "hard (difficulty 4/5)",
  5: "very hard (difficulty 5/5)",
};

// Arithmetic & number theory — primary, duplicated for higher sampling weight
const ARITHMETIC_POOL = [
  "order of operations (BEDMAS) with mixed operators",
  "prime numbers — identify, count",
  "LCM and GCF of two numbers",
  "divisibility rules (is X divisible by Y?)",
  "modular arithmetic / clock math (e.g. 47 mod 6)",
  "odd/even properties and number classification",
  "factorials (small values, e.g. 5! or 4! + 3!)",
  "digit sum, digit product, or number of digits in a result - define what these are in the question",
  "counting multiples or factors within a range",
];

// Algebra & computation — secondary, duplicated for higher sampling weight
const ALGEBRA_POOL = [
  "powers and square/cube roots (perfect values only)",
  "solve for x in a one- or two-step linear equation",
  "evaluate an expression by substituting a given value",
  "simple inequalities (find the smallest/largest integer satisfying it)",
  "percentages — find X% of N, or what % is X of N",
  "ratios and proportional scaling",
  "simple averages / mean of a small integer set",
  "basic fractions that simplify to whole numbers",
  "simple interest (I = P·R·T, integer result) — state the formula in the question",
  "counting and basic combinatorics (small permutations/combinations) — state the formula in the question",
];

// Light applied / word problems — minor, for occasional flavour only
const APPLIED_POOL = [
  "speed, distance, and time word problems (integer answers)",
  "short engineering-flavoured word problems (loads, pipes, flow rates — integer answers)",
  "area or perimeter of rectangles and triangles",
  "simple angle rules (angles in a triangle, supplementary/complementary angles)",
];

// Arithmetic and algebra entries appear ~3× more often than applied topics
const TOPIC_POOL = [
  ...ARITHMETIC_POOL,
  ...ARITHMETIC_POOL,
  ...ARITHMETIC_POOL,
  ...ALGEBRA_POOL,
  ...ALGEBRA_POOL,
  ...ALGEBRA_POOL,
  ...APPLIED_POOL,
];

function pickTopics(n: number): string[] {
  const shuffled = [...TOPIC_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export const generateQuestions = action({
  args: { difficulty: v.number() },
  returns: v.array(v.object({ question: v.string(), answer: v.number() })),
  handler: async (ctx, args) => {
    const difficultyLabel =
      DIFFICULTY_LABELS[args.difficulty] ?? DIFFICULTY_LABELS[3];
    const focusTopics = pickTopics(5);
    const seed = Math.floor(Math.random() * 1_000_000);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in Convex environment variables");

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      temperature: 1,
      system:
        'You output only valid JSON arrays. No explanations, no markdown, no code fences, no commentary. Every response is a raw JSON array of exactly 20 objects, each with a "question" string and an "answer" integer.',
      messages: [
        {
          role: "user",
          content: `[Seed: ${seed}] Create 20 questions that are ${difficultyLabel} scaled for drunk engineering students to answer on a phone where they can just enter numbers, and they don't have access to pen/paper or a calculator. The crowd is a mix of civil and software engineers, so questions must stay approachable to both — even at the hardest difficulty. The questions should be heavily rooted in arithmetic, number theory, and algebra — these are the primary focus. For this batch, lean towards these specific topic areas: ${focusTopics.join(", ")}. Mix up the phrasing style — some questions should be direct calculations, some "solve for x", some "what is the next term", some evaluate-the-expression, some fill-in-the-blank — so the set feels varied. Avoid binary, bitwise operations, heavy geometry, or anything requiring a formula sheet. Skew the difficulty about one level easier than you normally would — these people are impaired and having fun, not writing an exam. All answers must be whole numbers (integers).`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("AI returned an unexpected format");

    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0)
      throw new Error("AI returned an unexpected format");

    return (parsed as Array<{ question: unknown; answer: unknown }>).map(
      (q) => ({
        question: String(q.question),
        answer: Math.round(Number(q.answer)),
      }),
    );
  },
});
