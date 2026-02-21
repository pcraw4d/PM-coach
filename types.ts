
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
  howTo: string;
  whyItMatters: string;
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
  followUpQuestions: string[];
  followUpTranscription: string;
  rubricScores: FeedbackScore[];
  strengths: string[];
  weaknesses: string[];
  improvementItems: ImprovementItem[];
  recommendedResources: Resource[];
  communicationAnalysis: CommunicationAnalysis;
  benchmarkResponse: string;
}

export interface KnowledgeMission {
  id: string;
  title: string;
  source: string;
  url: string;
  type: 'READING' | 'PODCAST' | 'VIDEO';
  summary: string;
  xpAwarded: number;
  isCompleted?: boolean;
}

export interface StoredInterview {
  id: string;
  activityType: 'INTERVIEW';
  timestamp: number;
  questionTitle: string;
  type: InterviewType;
  result: InterviewResult;
}

export interface StoredMission {
  id: string;
  activityType: 'MISSION';
  timestamp: number;
  title: string;
  missionType: 'READING' | 'PODCAST' | 'VIDEO';
  url: string;
  source: string;
  xpAwarded: number;
}

export type HistoryItem = StoredInterview | StoredMission;

export type InterviewPhase = 'auth' | 'onboarding' | 'config' | 'question' | 'recording' | 'analyzing' | 'grilling' | 'recording-followup' | 'result' | 'history' | 'settings' | 'custom-input';

export interface SyncData {
  user: User;
  history: HistoryItem[];
  missions?: KnowledgeMission[];
  missionsTimestamp?: number;
  lastUpdated: number;
}
