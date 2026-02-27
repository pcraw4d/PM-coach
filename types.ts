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

export interface KnowledgeMission {
  id: string;
  title: string;
  source: string;
  url: string;
  type: string;
  summary: string;
  xpAwarded: number;
  isCompleted?: boolean;
  targetedSkill?: string;
}

export interface SyncData {
  lastUpdated: number;
  history: HistoryItem[];
  missions?: KnowledgeMission[];
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
  specificityScore: number;
  executiveFramingScore: number;
  hedgingLanguageFound: string[];
  clarityScore: number;
  structureScore: number;
  overallAssessment: 'Strong' | 'Average' | 'Needs Work';
  summary: string;
}

export interface TranscriptAnnotation {
  text: string;
  type: 'strength' | 'weakness' | 'qualifier' | 'neutral';
  feedback?: string;
  whyItMatters?: string;
  uid?: string;
}

export interface GoldenPathStep {
  title: string;
  content: string;
  why: string;
  strategicTradeOffs: string; // Added: Explains why alternatives were rejected
}

export interface UserLogicStep {
  step: string;
  isAligned: boolean;
  staffPivot?: string;
}

export interface InterviewResult {
  overallScore: number;
  visionScore: number; 
  defenseScore: number; 
  transcription: string;
  followUpTranscription: string;
  followUpQuestions: string[];
  
  userLogicPath: UserLogicStep[]; 
  defensivePivotScore: number; 
  defensivePivotAnalysis: string; 
  
  annotatedVision: TranscriptAnnotation[];
  annotatedDefense: TranscriptAnnotation[];
  goldenPath: GoldenPathStep[];
  
  rubricScores: FeedbackScore[];
  strengths: string[];
  weaknesses: string[];
  improvementItems: ImprovementItem[];
  recommendedResources: Resource[];
  communicationAnalysis: CommunicationAnalysis;
  benchmarkResponse: string;
}

export interface HistoryItem {
  id: string;
  activityType: 'INTERVIEW' | 'MISSION';
  timestamp: number;
  questionTitle?: string;
  type?: InterviewType;
  result?: InterviewResult;
  title?: string;
  xpAwarded?: number;
}

export type InterviewPhase = 'config' | 'question' | 'recording' | 'analyzing' | 'grilling' | 'recording-followup' | 'result' | 'history' | 'settings' | 'custom-input' | 'practice-delta';

export type TrendDirection = 'improving' | 'plateauing' | 'regressing';

export interface WeaknessPattern {
  category: string;
  sessionCount: number;
  averageScore: number;
  trend: TrendDirection;
  recurringActions: string[];
}

export interface AggregatedWeaknessProfile {
  topWeaknesses: WeaknessPattern[];
  hedgingTrend: { timestamp: number; count: number }[];
  logicAlignmentTrend: { timestamp: number; percentage: number }[];
  lastComputed: number;
}
