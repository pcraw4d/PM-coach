
export enum InterviewType {
  PRODUCT_SENSE = 'PRODUCT_SENSE',
  ANALYTICAL_THINKING = 'ANALYTICAL_THINKING'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarSeed: string;
  joinedAt: number;
  hasCompletedOnboarding?: boolean;
}

export interface Question {
  id: string;
  type: InterviewType;
  text: string;
  hint?: string;
  isCustom?: boolean;
}

export interface FeedbackScore {
  category: string;
  score: number;
  reasoning: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'reading' | 'video';
}

export interface ImprovementItem {
  category: string;
  action: string;
  effort: 'Low' | 'Medium' | 'High';
  impact: 'Low' | 'Medium' | 'High';
}

export interface CommunicationAnalysis {
  tone: string;
  confidenceScore: number;
  clarityScore: number;
  overallAssessment: 'Strong' | 'Average' | 'Needs Work';
  summary: string;
}

export interface InterviewResult {
  overallScore: number;
  transcription: string;
  rubricScores: FeedbackScore[];
  strengths: string[];
  weaknesses: string[];
  improvementItems: ImprovementItem[];
  recommendedResources: Resource[];
  communicationAnalysis: CommunicationAnalysis;
}

export interface StoredInterview {
  id: string;
  timestamp: number;
  questionTitle: string;
  type: InterviewType;
  result: InterviewResult;
}

export type InterviewPhase = 'auth' | 'onboarding' | 'config' | 'question' | 'recording' | 'analyzing' | 'result' | 'history' | 'settings' | 'custom-input';
