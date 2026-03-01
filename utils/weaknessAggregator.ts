import { 
  HistoryItem, 
  AggregatedWeaknessProfile, 
  WeaknessPattern, 
  TrendDirection,
  InterviewResult
} from '../types';

export function computeWeaknessProfile(history: HistoryItem[]): AggregatedWeaknessProfile {
  // Filter for valid interviews with results, sorted by date (oldest first)
  // Explicitly exclude PRACTICE items
  const interviews = history
    .filter(h => h.activityType === 'INTERVIEW' && h.result)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Default empty profile
  const defaultProfile: AggregatedWeaknessProfile = {
    topWeaknesses: [],
    hedgingTrend: [],
    logicAlignmentTrend: [],
    lastComputed: Date.now()
  };

  // Need at least 2 sessions to establish a pattern/trend
  if (interviews.length < 2) {
    return defaultProfile;
  }

  const hedgingTrend: { timestamp: number; count: number }[] = [];
  const logicAlignmentTrend: { timestamp: number; percentage: number }[] = [];
  
  // Data aggregation structures
  // Map<CategoryName, Data>
  const categoryData = new Map<string, { 
    scores: number[]; 
    actions: Set<string>;
    occurrenceCount: number;
  }>();

  interviews.forEach(interview => {
    const result = interview.result as InterviewResult;
    
    // 1. Track Hedging Trend
    const hedgingCount = result.communicationAnalysis?.hedgingLanguageFound?.length || 0;
    hedgingTrend.push({ timestamp: interview.timestamp, count: hedgingCount });

    // 2. Track Logic Alignment Trend
    if (result.userLogicPath && result.userLogicPath.length > 0) {
      const alignedCount = result.userLogicPath.filter(step => step.isAligned).length;
      const percentage = Math.round((alignedCount / result.userLogicPath.length) * 100);
      logicAlignmentTrend.push({ timestamp: interview.timestamp, percentage });
    }

    // Track categories seen in this specific session to increment occurrenceCount correctly
    const categoriesSeenInSession = new Set<string>();

    // 3. Aggregate Rubric Scores
    result.rubricScores.forEach(score => {
      if (!categoryData.has(score.category)) {
        categoryData.set(score.category, { scores: [], actions: new Set(), occurrenceCount: 0 });
      }
      const data = categoryData.get(score.category)!;
      data.scores.push(score.score);
      categoriesSeenInSession.add(score.category);
    });

    // 4. Aggregate Improvement Items
    result.improvementItems.forEach(item => {
      if (!categoryData.has(item.category)) {
        categoryData.set(item.category, { scores: [], actions: new Set(), occurrenceCount: 0 });
      }
      const data = categoryData.get(item.category)!;
      data.actions.add(item.action);
      categoriesSeenInSession.add(item.category);
    });

    // Increment occurrence count for all categories found in this session
    categoriesSeenInSession.forEach(cat => {
      const data = categoryData.get(cat)!;
      data.occurrenceCount += 1;
    });
  });

  const weaknesses: WeaknessPattern[] = [];

  categoryData.forEach((data, category) => {
    // Calculate Average Score
    let averageScore = 0;
    if (data.scores.length > 0) {
      averageScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    } else {
      // If a category appears only in improvement items (no rubric score), 
      // we infer it's a weakness. Assigning a proxy score of 60 for ranking purposes.
      averageScore = 60; 
    }

    // Identify as Weakness if:
    // 1. Average score is below 75 (Staff threshold)
    // 2. OR it appears in improvement items across multiple sessions (recurring habit)
    const isScoreWeakness = averageScore < 75;
    const isRecurringHabit = data.scores.length === 0 && data.occurrenceCount >= 2;

    if (isScoreWeakness || isRecurringHabit) {
      // Calculate Trend
      let trend: TrendDirection = 'plateauing';
      
      // Only calculate trend if we have at least 2 data points for scores
      if (data.scores.length >= 2) {
        const midPoint = Math.floor(data.scores.length / 2);
        const firstHalf = data.scores.slice(0, midPoint);
        const secondHalf = data.scores.slice(midPoint);
        
        const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        if (avgSecond > avgFirst + 5) trend = 'improving';
        else if (avgSecond < avgFirst - 5) trend = 'regressing';
      }

      weaknesses.push({
        category,
        sessionCount: data.occurrenceCount,
        averageScore: Math.round(averageScore),
        trend,
        recurringActions: Array.from(data.actions).slice(0, 3) // Keep top 3 distinct actions
      });
    }
  });

  // Rank Weaknesses to surface most urgent gaps
  // Ranking Logic:
  // 1. Score Gap (Lower score = Higher urgency)
  // 2. Frequency (Higher occurrence = Higher urgency)
  weaknesses.sort((a, b) => {
    if (a.averageScore !== b.averageScore) {
      return a.averageScore - b.averageScore; // Ascending score (lower is worse)
    }
    return b.sessionCount - a.sessionCount; // Descending frequency (more frequent is worse)
  });

  return {
    topWeaknesses: weaknesses.slice(0, 5), // Return top 5
    hedgingTrend,
    logicAlignmentTrend,
    lastComputed: Date.now()
  };
}
