import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { InterviewType, InterviewResult, KnowledgeMission, ImprovementItem } from "../types.ts";

export class GeminiService {
  constructor() {}

  private extractJson(text: string): any {
    if (!text) return null;
    try {
      let cleaned = text.trim();
      cleaned = cleaned.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      
      const firstArray = cleaned.indexOf('[');
      const firstObject = cleaned.indexOf('{');
      let startIdx = -1;
      let endIdx = -1;
      
      if (firstArray !== -1 && (firstObject === -1 || firstArray < firstObject)) {
        startIdx = firstArray; 
        endIdx = cleaned.lastIndexOf(']');
      } else if (firstObject !== -1) {
        startIdx = firstObject; 
        endIdx = cleaned.lastIndexOf('}');
      }
      
      if (startIdx === -1) {
        console.error("[GeminiService] No JSON structure found in text:", text);
        return null;
      }

      if (endIdx === -1 || endIdx <= startIdx) {
        let fragment = cleaned.substring(startIdx);
        const openBraces = (fragment.match(/{/g) || []).length;
        const closeBraces = (fragment.match(/}/g) || []).length;
        const openBrackets = (fragment.match(/\[/g) || []).length;
        const closeBrackets = (fragment.match(/]/g) || []).length;
        for (let i = 0; i < (openBrackets - closeBrackets); i++) fragment += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) fragment += '}';
        try {
          return JSON.parse(fragment);
        } catch (e) {
          console.error("[GeminiService] Failed to parse JSON fragment:", fragment, e);
          return null;
        }
      }
      
      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      const sanitized = jsonCandidate.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized);
    } catch (e) {
      console.error("[GeminiService] JSON extraction failed. Raw text:", text, e);
      return null;
    }
  }

  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  /**
   * PASS 1: Transcription using Flash. 
   * Optimized for large audio files (up to 30 mins) where latency and cost-efficiency matter most.
   */
  async transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
    return this.withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const prompt = "Transcribe this audio exactly. Do not add any commentary. Ensure highly technical PM terminology is captured precisely.";
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] }
      });
      
      return response.text || "";
    });
  }

  async discoverMissions(): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `Search for 4 RECENT high-value PM resources from top firms (Lenny's, SVPG, Reforge). Return JSON array: [{id, title, source, url, type, summary, xpAwarded: number (25-50)}]`;
    
    try {
      return await this.withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          contents: prompt,
          config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
        });
        const missions = this.extractJson(response.text || "") || [];
        return missions.map((m: any) => ({
          ...m,
          xpAwarded: typeof m.xpAwarded === 'number' && !isNaN(m.xpAwarded) 
            ? Math.max(25, Math.min(50, m.xpAwarded)) 
            : Math.floor(Math.random() * 26) + 25
        }));
      });
    } catch (error) {
      return [];
    }
  }

  async generateFollowUps(type: InterviewType, question: string, transcript: string) {
    return this.withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const trackContext = type === InterviewType.PRODUCT_SENSE 
        ? "Challenge the user's goal definition and company-specific moat. Probe for 'second-order effects'—long-term consequences of their design."
        : "Challenge the user's metric trade-offs. Ask about cannibalization and the 'unintended consequences' of optimizing for their primary metric.";

      const prompt = `
        Question: "${question}"
        User Response: "${transcript}"
        
        Identify 2 Staff-level aggressive follow-up questions.
        Context: ${trackContext}
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              followUpQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["followUpQuestions"]
          }
        }
      });
      return this.extractJson(response.text || "");
    });
  }

  /**
   * PASS 2: Deep Logic Audit using Pro.
   * Uses a single request with ThinkingLevel.LOW for better reliability.
   * Includes a Flash fallback if Pro fails or times out.
   */
  async analyzeFullSession(
    type: InterviewType, 
    question: string, 
    initialTranscript: string, 
    followUpQuestions: string[], 
    followUpTranscript: string
  ): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    const specializedRubric = type === InterviewType.PRODUCT_SENSE ? `
      AUDIT FOCUS: PRODUCT SENSE
      1. Goal Definition
         - < 60 (Needs Work): Jumps straight to features or personas without defining a business goal.
         - 60-79 (Senior): Defines a valid business goal but fails to tie it to the company's core mission.
         - 80-100 (Staff): Prioritizes a high-leverage business objective before personas and explicitly ties it to the company's strategic moat.
      2. User Problem Prioritization
         - < 60 (Needs Work): Fails to identify a critical user need or relies on superficial demographics.
         - 60-79 (Senior): Identifies valid pain points but struggles to prioritize them based on impact and frequency.
         - 80-100 (Staff): Segments users by behavior/pain point and identifies a "hair-on-fire" problem aligning with the business goal.
      3. Solution Creativity & Design
         - < 60 (Needs Work): Proposes generic, incremental, or unfeasible solutions.
         - 60-79 (Senior): Proposes solid, logical solutions but lacks innovation or a "magic moment".
         - 80-100 (Staff): Proposes a 10x better, innovative solution that creates a "magic moment" while remaining technically grounded.
      4. Execution & Sequencing (MVP)
         - < 60 (Needs Work): Struggles to define an MVP or just proposes building a smaller version of the final product.
         - 60-79 (Senior): Defines a reasonable V1 but doesn't explicitly isolate the riskiest assumptions.
         - 80-100 (Staff): Defines a ruthless MVP that specifically isolates and tests the riskiest assumption with high ROI.
      5. Strategic Moat
         - < 60 (Needs Work): Ignores the company's unique advantages or proposes generic solutions.
         - 60-79 (Senior): Acknowledges the company's strengths but doesn't fully leverage them in the solution.
         - 80-100 (Staff): Deeply integrates the company's unique leverage and ecosystem into the core of the strategy.
      6. Second-Order Effects
         - < 60 (Needs Work): Fails to consider long-term consequences or ecosystem impacts.
         - 60-79 (Senior): Identifies basic risks but lacks a comprehensive mitigation strategy.
         - 80-100 (Staff): Proactively addresses long-term ecosystem impact, cannibalization, and complex trade-offs.
    ` : `
      AUDIT FOCUS: ANALYTICAL THINKING
      1. Root Cause Analysis (Debugging)
         - < 60 (Needs Work): Jumps to conclusions without a structured approach to isolate variables.
         - 60-79 (Senior): Uses a basic structure to investigate but misses edge cases or external factors.
         - 80-100 (Staff): Uses a MECE framework to systematically isolate internal (bugs, tracking) vs. external (seasonality, competitors) factors.
      2. Hypothesis Generation
         - < 60 (Needs Work): Proposes random guesses without data backing or validation plans.
         - 60-79 (Senior): Formulates reasonable hypotheses but relies on expensive A/B tests to validate everything.
         - 80-100 (Staff): Formulates data-backed hypotheses and proposes specific, low-cost ways to validate them (e.g., querying a specific cohort).
      3. Metric Funnel
         - < 60 (Needs Work): Selects vanity metrics or fails to define a clear North Star.
         - 60-79 (Senior): Defines a solid North Star but lacks comprehensive guardrail metrics.
         - 80-100 (Staff): Establishes a robust metric funnel with a precise North Star and critical guardrails.
      4. Unintended Consequences
         - < 60 (Needs Work): Ignores how optimizing for the primary metric might harm other areas.
         - 60-79 (Senior): Acknowledges potential harm but dismisses it without deep analysis.
         - 80-100 (Staff): Deeply analyzes how success in X hurts Y and proposes sophisticated mitigations.
      5. Incremental Lift
         - < 60 (Needs Work): Confuses absolute growth with incremental lift or ignores cannibalization.
         - 60-79 (Senior): Understands incremental lift but struggles to design a mechanism to measure it accurately.
         - 80-100 (Staff): Perfectly distinguishes absolute growth from cannibalization and designs precise measurement mechanisms.
      6. Trade-off Decision Making
         - < 60 (Needs Work): Freezes when metrics conflict or makes a gut-based decision without a framework.
         - 60-79 (Senior): Acknowledges the conflict but struggles to make a definitive recommendation.
         - 80-100 (Staff): Establishes a clear framework for breaking ties (e.g., LTV vs. CAC, strategic alignment) and makes a definitive "go/no-go" recommendation.
    `;

    const prompt = `
      ACT AS A STAFF PM BAR-RAISER.
      Align with Lenny's Newsletter standards.

      Question: ${question}
      Response: ${initialTranscript}
      Follow-up Qs: ${followUpQuestions.join(', ')}
      Follow-up Defense: ${followUpTranscript}
      
      ${specializedRubric}

      LOGIC MAPPING INSTRUCTIONS:
      - userLogicPath: Break down the user's response into a sequence of logical steps. For each step, determine if it aligns with the Staff Golden Path (isAligned). If it does NOT align, provide a specific 'staffPivot' explaining the tactical correction for that specific line.
      - goldenPath: Provide the ideal Staff-level sequence. MUST be at least 5 steps long to ensure a comprehensive strategic map.

      COMMUNICATION ANALYSIS INSTRUCTIONS:
      - Evaluate Stakeholder Influence (Structure): Does the candidate structure their answer in a way that brings cross-functional partners (Engineering, Design, Leadership) along? 
      - Staff Standard for Structure: Uses executive summaries, "Rule of Three", and explicitly calls out when they are making an assumption that requires engineering validation.

      SCORING INSTRUCTIONS:
      - ALL scores (rubricScores, confidenceScore, clarityScore, structureScore) MUST be on a 0-100 scale.
      - 0-59: Needs Work
      - 60-79: Average/Senior
      - 80-100: Staff/Bar-Raiser
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        userLogicPath: { 
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              step: { type: Type.STRING },
              isAligned: { type: Type.BOOLEAN },
              staffPivot: { type: Type.STRING }
            },
            required: ["step", "isAligned"]
          }
        },
        defensivePivotAnalysis: { type: Type.STRING },
        rubricScores: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { 
                type: Type.STRING,
                enum: type === InterviewType.PRODUCT_SENSE 
                  ? ["Goal Definition", "User Problem Prioritization", "Solution Creativity & Design", "Execution & Sequencing (MVP)", "Strategic Moat", "Second-Order Effects"]
                  : ["Root Cause Analysis (Debugging)", "Hypothesis Generation", "Metric Funnel", "Unintended Consequences", "Incremental Lift", "Trade-off Decision Making"]
              },
              score: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["category", "score", "reasoning"]
          }
        },
        improvementItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              action: { type: Type.STRING },
              howTo: { type: Type.STRING },
              whyItMatters: { type: Type.STRING },
              effort: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["category", "action", "howTo", "whyItMatters", "effort", "impact"]
          }
        },
        communicationAnalysis: {
          type: Type.OBJECT,
          properties: {
            tone: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            clarityScore: { type: Type.NUMBER },
            structureScore: { type: Type.NUMBER },
            overallAssessment: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["tone", "confidenceScore", "clarityScore", "structureScore", "overallAssessment", "summary"]
        },
        annotatedVision: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["text", "type", "feedback"]
          }
        },
        annotatedDefense: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["text", "type", "feedback"]
          }
        },
        goldenPath: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              why: { type: Type.STRING },
              strategicTradeOffs: { type: Type.STRING }
            },
            required: ["title", "content", "why", "strategicTradeOffs"]
          }
        },
        recommendedResources: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              url: { type: Type.STRING },
              type: { type: Type.STRING }
            },
            required: ["title", "url", "type"]
          }
        },
        benchmarkResponse: { type: Type.STRING }
      },
      required: [
        "userLogicPath", "defensivePivotAnalysis", "rubricScores", 
        "improvementItems", "communicationAnalysis", "annotatedVision", 
        "annotatedDefense", "goldenPath", "recommendedResources", "benchmarkResponse"
      ]
    };

    const formatResult = (data: any): InterviewResult => {
      const rubricScores = data.rubricScores || [];
      const comms = data.communicationAnalysis || { confidenceScore: 0, clarityScore: 0, structureScore: 0 };
      
      // Calculate scores mathematically
      const avgRubric = rubricScores.length > 0 
        ? rubricScores.reduce((sum: number, r: any) => sum + r.score, 0) / rubricScores.length 
        : 0;
      
      const avgComms = (comms.confidenceScore + comms.clarityScore + (comms.structureScore || 0)) / 3;
      
      // Overall score: 80% rubric, 20% communication
      const overallScore = Math.round((avgRubric * 0.8) + (avgComms * 0.2));
      
      // Vision score: average of all but the last rubric category
      const visionRubrics = rubricScores.slice(0, Math.max(1, rubricScores.length - 1));
      const visionScore = visionRubrics.length > 0
        ? Math.round(visionRubrics.reduce((sum: number, r: any) => sum + r.score, 0) / visionRubrics.length)
        : 0;
        
      // Defense score: the last rubric category (which corresponds to the follow-up defense)
      const defenseScore = rubricScores.length > 0 ? rubricScores[rubricScores.length - 1].score : 0;
      const defensivePivotScore = defenseScore; // Use the same score for the pivot

      return {
        ...data,
        overallScore,
        visionScore,
        defenseScore,
        defensivePivotScore,
        transcription: initialTranscript,
        followUpQuestions,
        followUpTranscription: followUpTranscript,
        strengths: rubricScores.filter((s: any) => s.score >= 80).map((s: any) => s.category),
        weaknesses: rubricScores.filter((s: any) => s.score < 60).map((s: any) => s.category)
      };
    };

    return this.withRetry(async () => {
      try {
        // Attempt Pro Audit with lower thinking level for stability
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseSchema: responseSchema
          }
        });
        const data = this.extractJson(response.text || "");
        if (data) return formatResult(data);
      } catch (e) {
        console.warn("[GeminiService] Pro Audit failed or timed out, falling back to Flash:", e);
      }

      // Fallback to Flash for guaranteed completion
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      });
      
      const data = this.extractJson(response.text || "");
      if (!data) {
        console.error("[GeminiService] Flash fallback also failed to return valid JSON.");
        throw new Error("Critical JSON failure: The audit response was incomplete or corrupted.");
      }
      
      return formatResult(data);
    });
  }

  async verifyDeltaPractice(delta: ImprovementItem, audioBase64: string, mimeType: string): Promise<{ success: boolean; feedback: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `
      Verify if the user successfully bridged this gap: "${delta.action}".
      Look for: Executive presence and precise PM terminology.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              success: { type: Type.BOOLEAN },
              feedback: { type: Type.STRING }
            },
            required: ["success", "feedback"]
          }
        }
      });
      return this.extractJson(response.text || "");
    } catch (e) {
      console.error("[GeminiService] Delta practice verification failed:", e);
      return { success: false, feedback: "Verification timed out." };
    }
  }
}

export const geminiService = new GeminiService();