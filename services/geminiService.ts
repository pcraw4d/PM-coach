import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
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
      
      if (startIdx === -1) return null;

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
          return null;
        }
      }
      
      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      const sanitized = jsonCandidate.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized);
    } catch (e) {
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = "Transcribe this audio exactly. Do not add any commentary. Ensure highly technical PM terminology is captured precisely.";
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] }
      });
      
      return response.text || "";
    });
  }

  async discoverMissions(): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const trackContext = type === InterviewType.PRODUCT_SENSE 
        ? "Challenge the user's goal definition and company-specific moat. Probe for 'second-order effects'—long-term consequences of their design."
        : "Challenge the user's metric trade-offs. Ask about cannibalization and the 'unintended consequences' of optimizing for their primary metric.";

      const prompt = `
        Question: "${question}"
        User Response: "${transcript}"
        
        Identify 2 Staff-level aggressive follow-up questions.
        Context: ${trackContext}
        JSON: {followUpQuestions: string[]}
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      return this.extractJson(response.text);
    });
  }

  /**
   * PASS 2: Deep Logic Audit using Pro.
   * Maximized Thinking Budget (32768) to ensure non-obvious reasoning.
   * Streaming prevents connection drops for 30-minute session summaries.
   */
  async analyzeFullSession(
    type: InterviewType, 
    question: string, 
    initialTranscript: string, 
    followUpQuestions: string[], 
    followUpTranscript: string
  ): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
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

      RETURN JSON SCHEMA:
      {
        "overallScore": number,
        "visionScore": number,
        "defenseScore": number,
        "userLogicPath": "Brief path summary",
        "defensivePivotScore": number,
        "defensivePivotAnalysis": "Consistency check",
        "annotatedVision": [{ "text": string, "type": "strength"|"weakness"|"qualifier", "feedback": "Critique + REWRITE + ACTION" }],
        "annotatedDefense": [{ "text": string, "type": "strength"|"weakness"|"qualifier", "feedback": "Critique + REWRITE + ACTION" }],
        "goldenPath": [{ "title": string, "content": string, "why": string, "strategicTradeOffs": string }],
        "rubricScores": [{ "category": string, "score": number, "reasoning": string }],
        "improvementItems": [{ "category": string, "action": string, "howTo": string, "whyItMatters": string, "effort": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High" }],
        "recommendedResources": [{ "title": string, "url": string, "type": "reading" }],
        "communicationAnalysis": { "tone": string, "confidenceScore": number, "clarityScore": number, "overallAssessment": "Strong"|"Average"|"Needs Work", "summary": string },
        "benchmarkResponse": "Complete Staff-level script"
      }
    `;

    return this.withRetry(async () => {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 32768 } // MAX budget for the deepest logic audit
        }
      });

      let fullText = "";
      for await (const chunk of stream) {
        fullText += (chunk as GenerateContentResponse).text || "";
      }

      const data = this.extractJson(fullText);
      if (!data) throw new Error("Critical JSON failure: The audit response was incomplete or corrupted.");
      
      return { 
        ...data, 
        transcription: initialTranscript, 
        followUpQuestions, 
        followUpTranscription: followUpTranscript 
      };
    });
  }

  async verifyDeltaPractice(delta: ImprovementItem, audioBase64: string, mimeType: string): Promise<{ success: boolean; feedback: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Verify if the user successfully bridged this gap: "${delta.action}".
      Look for: Executive presence and precise PM terminology.
      Return JSON: { "success": boolean, "feedback": "Critique focusing on technical phrasing." }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
      });
      return this.extractJson(response.text);
    } catch (e) {
      return { success: false, feedback: "Verification timed out." };
    }
  }
}

export const geminiService = new GeminiService();