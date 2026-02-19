
import React from 'react';
import { InterviewType, Question } from './types';

export const QUESTIONS: Question[] = [
  {
    id: 'ps-1',
    type: InterviewType.PRODUCT_SENSE,
    text: "Design a grocery shopping experience for the blind.",
    hint: "Think about the end-to-end journey from finding items to checkout."
  },
  {
    id: 'ps-2',
    type: InterviewType.PRODUCT_SENSE,
    text: "Improve the Instagram experience for creators.",
    hint: "Focus on discovery, monetization, or content creation tools."
  },
  {
    id: 'ps-3',
    type: InterviewType.PRODUCT_SENSE,
    text: "How would you design a digital library for children under 5?",
    hint: "Consider accessibility, parental controls, and engagement for pre-readers."
  },
  {
    id: 'at-1',
    type: InterviewType.ANALYTICAL_THINKING,
    text: "Should Uber launch a helicopter service in New York City?",
    hint: "Estimate demand, costs, and strategic value (Trade-off Analysis)."
  },
  {
    id: 'at-2',
    type: InterviewType.ANALYTICAL_THINKING,
    text: "LinkedIn notifications are down by 10% WoW. How do you investigate?",
    hint: "Use a structured root cause analysis framework (Troubleshooting)."
  },
  {
    id: 'at-3',
    type: InterviewType.ANALYTICAL_THINKING,
    text: "Estimate the market size for noise-canceling headphones in London.",
    hint: "Break down the population by lifestyle and income segments (Estimation)."
  },
  {
    id: 'at-4',
    type: InterviewType.ANALYTICAL_THINKING,
    text: "How would you set goals for YouTube Shorts?",
    hint: "Define primary, secondary, and counter-metrics (Goal Setting)."
  }
];

export const RUBRICS = {
  [InterviewType.PRODUCT_SENSE]: [
    "Clarify: Mission & Constraints",
    "Identify: User Segments & Personas",
    "Prioritize: Strategic Pain Points",
    "Brainstorm: Visionary Solutions",
    "Refine: Trade-offs & North Star Metrics"
  ],
  [InterviewType.ANALYTICAL_THINKING]: [
    "Structured Framework (MECE)",
    "Metric Definition (Goals/Counters)",
    "Root Cause Investigation",
    "Data-Driven Prioritization",
    "Trade-off Analysis & Action"
  ]
};
