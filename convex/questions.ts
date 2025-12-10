export type QuestionSet = {
  id: string;
  name: string;
  description: string;
  questions: Array<{
    question: string;
    answer: number;
  }>;
};

export const QUESTION_SETS: Array<QuestionSet> = [
  {
    id: "basic-arithmetic",
    name: "Testing one",
    description: "Designed to demonstrate how the UI works so people can find all the right buttons",
    questions: [
      { question: "15 + 27", answer: 42 },
      { question: "-8 × 9", answer: -72 },
      { question: "100 - 43", answer: 57 },
      { question: "144 ÷ 12", answer: 12 },
      { question: "23 + 56", answer: 79 },
      { question: "7 × 8", answer: 56 },
      { question: "91 - 38", answer: 53 },
      { question: "81 ÷ -9", answer: -9 },
      { question: "34 + 29", answer: 63 },
      { question: "12 × 5", answer: 60 },
    ],
  },
];
