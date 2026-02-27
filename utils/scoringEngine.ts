import { InterviewType, FeedbackScore, CommunicationAnalysis } from '../types';

export interface PMLevelBand {
  label: 'Staff' | 'Senior' | 'Mid-level' | 'Associate';
  threshold: number;
  floorThreshold: number;
  gapToNextLevel?: number;
}

export interface SessionScoreBreakdown {
  overallScore: number;
  weightedRubricScore: number;
  communicationScore: number;
  floorScore: number;
  ceilingScore: number;
  floorCategory: string;
  ceilingCategory: string;
  pmLevel: PMLevelBand;
  penaltyApplied: boolean;
}

const PRODUCT_SENSE_WEIGHTS: Record<string, number> = {
  "Goal Definition": 0.25,
  "User Problem Prioritization": 0.20,
  "Solution Creativity & Design": 0.20,
  "Execution & Sequencing (MVP)": 0.15,
  "Strategic Moat": 0.10,
  "Second-Order Effects": 0.10
};

const ANALYTICAL_THINKING_WEIGHTS: Record<string, number> = {
  "Root Cause Analysis (Debugging)": 0.25,
  "Hypothesis Generation": 0.20,
  "Metric Funnel": 0.20,
  "Trade-off Decision Making": 0.15,
  "Unintended Consequences": 0.10,
  "Incremental Lift": 0.10
};

export function computeSessionScore(
  rubricScores: FeedbackScore[],
  communicationAnalysis: CommunicationAnalysis,
  interviewType: InterviewType
): SessionScoreBreakdown {
  // 1. Calculate Weighted Rubric Score
  const weights = interviewType === InterviewType.PRODUCT_SENSE 
    ? PRODUCT_SENSE_WEIGHTS 
    : ANALYTICAL_THINKING_WEIGHTS;

  let totalWeight = 0;
  let weightedSum = 0;
  let minScore = 100;
  let maxScore = 0;
  let minCategory = '';
  let maxCategory = '';

  rubricScores.forEach(item => {
    // Match category loosely to handle minor variations or casing if needed, 
    // but for now assume exact match from the enum/constants.
    // If category is not in weights map, it contributes 0 weight (effectively skipped).
    const weight = weights[item.category] || 0;
    
    if (weight > 0) {
      weightedSum += item.score * weight;
      totalWeight += weight;
    }

    if (item.score < minScore) {
      minScore = item.score;
      minCategory = item.category;
    }
    if (item.score > maxScore) {
      maxScore = item.score;
      maxCategory = item.category;
    }
  });

  // Normalize if some categories are missing
  let rawWeightedRubricScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // 2. Apply Floor Penalty
  let penaltyApplied = false;
  if (minScore < 40) {
    if (rawWeightedRubricScore > 65) {
      rawWeightedRubricScore = 65;
      penaltyApplied = true;
    }
  }

  // 3. Calculate Communication Score
  const comms = communicationAnalysis;
  const commScore = (
    comms.clarityScore + 
    comms.structureScore + 
    comms.specificityScore + 
    comms.executiveFramingScore
  ) / 4;

  // 4. Calculate Final Overall Score
  // 70% Rubric, 15% Communication, 15% Reserved (0 for now)
  const overallScore = Math.round((rawWeightedRubricScore * 0.70) + (commScore * 0.15));

  // 5. Determine PM Level
  let level: PMLevelBand;
  
  // Staff: 85+ overall, floor 70+
  if (overallScore >= 85 && minScore >= 70) {
    level = { label: 'Staff', threshold: 85, floorThreshold: 70, gapToNextLevel: 0 };
  } 
  // Senior: 75+ overall, floor 55+
  else if (overallScore >= 75 && minScore >= 55) {
    level = { 
      label: 'Senior', 
      threshold: 75, 
      floorThreshold: 55, 
      gapToNextLevel: Math.max(85 - overallScore, 70 - minScore) 
    };
  } 
  // Mid-level: 60+ overall, floor 40+
  else if (overallScore >= 60 && minScore >= 40) {
    level = { 
      label: 'Mid-level', 
      threshold: 60, 
      floorThreshold: 40, 
      gapToNextLevel: Math.max(75 - overallScore, 55 - minScore) 
    };
  } 
  // Associate: Below 60 or floor below 40
  else {
    level = { 
      label: 'Associate', 
      threshold: 0, 
      floorThreshold: 0, 
      gapToNextLevel: Math.max(60 - overallScore, 40 - minScore) 
    };
  }

  return {
    overallScore,
    weightedRubricScore: Math.round(rawWeightedRubricScore),
    communicationScore: Math.round(commScore),
    floorScore: minScore,
    ceilingScore: maxScore,
    floorCategory: minCategory,
    ceilingCategory: maxCategory,
    pmLevel: level,
    penaltyApplied
  };
}
