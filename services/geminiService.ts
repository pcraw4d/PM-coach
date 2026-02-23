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
      1. GOAL DEFINITION: Business objective prioritized before personas.
      2. STRATEGIC MOAT: Unique company leverage.
      3. SECOND-ORDER EFFECTS: Long-term ecosystem impact.
    ` : `
      AUDIT FOCUS: ANALYTICAL THINKING
      1. METRIC FUNNEL: North Star + Guardrails.
      2. UNINTENDED CONSEQUENCES: How success in X hurts Y.
      3. INCREMENTAL LIFT: Absolute growth vs cannibalization.
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
      - userLogicPath: Break down the user's response into a sequence of logical steps (e.g., ["Assumptions", "User Segmentation", "Feature Idea"]).
      - goldenPath: Provide the ideal Staff-level sequence.

      SCORING INSTRUCTIONS:
      - ALL scores (overallScore, visionScore, defenseScore, defensivePivotScore, rubricScores, confidenceScore, clarityScore) MUST be on a 0-100 scale.
      - 0-59: Needs Work
      - 60-79: Average/Senior
      - 80-100: Staff/Bar-Raiser
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        visionScore: { type: Type.NUMBER },
        defenseScore: { type: Type.NUMBER },
        userLogicPath: { 
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        defensivePivotScore: { type: Type.NUMBER },
        defensivePivotAnalysis: { type: Type.STRING },
        rubricScores: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
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
            overallAssessment: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["tone", "confidenceScore", "clarityScore", "overallAssessment", "summary"]
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
        "overallScore", "visionScore", "defenseScore", "userLogicPath", 
        "defensivePivotScore", "defensivePivotAnalysis", "rubricScores", 
        "improvementItems", "communicationAnalysis", "annotatedVision", 
        "annotatedDefense", "goldenPath", "recommendedResources", "benchmarkResponse"
      ]
    };

    const formatResult = (data: any): InterviewResult => {
      // Sanity check: Ensure all scores are 0-100
      const scaleScore = (s: any) => (typeof s === 'number' && s <= 10) ? s * 10 : s;
      
      const scaledData = {
        ...data,
        overallScore: scaleScore(data.overallScore),
        visionScore: scaleScore(data.visionScore),
        defenseScore: scaleScore(data.defenseScore),
        defensivePivotScore: scaleScore(data.defensivePivotScore),
        rubricScores: data.rubricScores.map((s: any) => ({ ...s, score: scaleScore(s.score) })),
        communicationAnalysis: {
          ...data.communicationAnalysis,
          confidenceScore: scaleScore(data.communicationAnalysis.confidenceScore),
          clarityScore: scaleScore(data.communicationAnalysis.clarityScore)
        }
      };

      return {
        ...scaledData,
        transcription: initialTranscript,
        followUpQuestions,
        followUpTranscription: followUpTranscript,
        strengths: scaledData.rubricScores.filter((s: any) => s.score >= 80).map((s: any) => s.category),
        weaknesses: scaledData.rubricScores.filter((s: any) => s.score < 60).map((s: any) => s.category)
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