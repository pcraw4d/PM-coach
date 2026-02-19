
export enum InterviewType {
  PRODUCT_SENSE = 'PRODUCT_SENSE',
  ANALYTICAL_THINKING = 'ANALYTICAL_THINKING'
}

export interface Question {
  id: string;
  type: InterviewType;
  text: string;
  hint?: string;
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

export interface InterviewResult {
  overallScore: number;
  transcription: string;
  rubricScores: FeedbackScore[];
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  recommendedResources: Resource[];
}

export type InterviewPhase = 'config' | 'question' | 'recording' | 'analyzing' | 'result';
