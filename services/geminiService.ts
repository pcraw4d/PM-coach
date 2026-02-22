import { GoogleGenAI, Type } from "@google/genai";
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

  async generateFollowUps(type: InterviewType, question: string, audioBase64: string, mimeType: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const trackContext = type === InterviewType.PRODUCT_SENSE 
      ? "Focus on challenging the user's goal definition and company-specific moat. Specifically probe for 'second-order effects'—what happens if this is successful? What are the unintended consequences?"
      : "Focus on challenging the user's metric trade-offs. Ask about cannibalization, ecosystem health, and 'unintended consequences' of optimizing for their primary metric.";

    const prompt = `Transcribe response to "${question}".
    Based on this response, identify 2 Staff-level aggressive follow-up questions that probe for second-order effects and unintended consequences of the candidate's chosen strategy.
    Context: ${trackContext}
    JSON: {transcription: string, followUpQuestions: string[]}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return this.extractJson(response.text);
  }

  async analyzeFullSession(type: InterviewType, question: string, initialTranscript: string, followUpQuestions: string[], followUpAudioBase64: string, mimeType: string): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const specializedRubric = type === InterviewType.PRODUCT_SENSE ? `
      AUDIT FOCUS: PRODUCT SENSE (Lenny's Guide / Staff PM Standard)
      1. GOAL DEFINITION: Did they explicitly state a business objective BEFORE users?
      2. STRATEGIC MOAT: Did they leverage company assets? Why is [Company] uniquely positioned?
      3. USER NUANCE: Did they find a non-obvious persona or underserved segment?
      4. SECOND-ORDER EFFECTS & UNINTENDED CONSEQUENCES: Did they identify potential downstream risks (e.g. cannibalization, platform safety, long-term habit erosion) of their solution?
      5. TRADE-OFFS: Did they acknowledge what they are SACRIFICING?
    ` : `
      AUDIT FOCUS: ANALYTICAL THINKING (Lenny's Guide / Execution Bar)
      1. METRIC FUNNEL: Did they define an L1 (North Star), L2 (Input metrics), and Guardrails/Counter-metrics?
      2. UNINTENDED CONSEQUENCES: Did they identify how optimizing for X could hurt Y (e.g. optimizing for clicks hurts quality or long-term retention)?
      3. HYPOTHESIS DEPTH: Did they brainstorm 3+ distinct, logical hypotheses (Internal, External, Seasonal)?
      4. CANNIBALIZATION & INCREMENTAL LIFT: Did they distinguish between absolute growth and true incremental lift?
      5. SECOND-ORDER EFFECTS: Did they analyze the broader ecosystem impact (e.g. impact on other product teams or long-term brand equity)?
    `;

    const prompt = `
      ACT AS A SENIOR PM BAR-RAISER (GOOGLE/META STAFF LEVEL).
      Context: Align strictly with "Lenny's Newsletter" benchmarks. 
      Focus heavily on identifying logical leaps, lack of second-order thinking, and missed unintended consequences.

      Type: ${type}
      Q: ${question}
      Part 1: ${initialTranscript}
      Part 2 (The Grill): ${followUpQuestions.join(', ')}
      
      ${specializedRubric}

      CRITICAL INSTRUCTIONS:
      1. For EVERY 'weakness' identified in annotated sections, the 'feedback' property MUST contain:
         - A specific critique emphasizing second-order effects or unintended consequences.
         - A "REWRITE" showing exact Staff-level phrasing.
         - An "ACTION" for improvement: A concrete, actionable step the user can take.
         - "EFFORT" (Low/Medium/High) and "IMPACT" (Low/Medium/High) for that action.
      
      2. For the 'improvementItems' array:
         - Map every identified weakness to a specific item.
         - 'howTo' must include a side-by-side comparison of user phrasing vs. ideal phrasing.
         - 'whyItMatters' must specifically mention the strategic impact, second-order consequences, or leadership perception.

      STRICT JSON STRUCTURE:
      {
        "overallScore": number,
        "visionScore": number,
        "defenseScore": number,
        "userLogicPath": "What framework they attempted vs what a Principal PM would use.",
        "defensivePivotScore": number(0-10),
        "defensivePivotAnalysis": "Check for consistency and confidence during the follow-ups.",
        "followUpTranscription": string,
        "annotatedVision": [{ "text": string, "type": "strength"|"weakness"|"qualifier", "feedback": "Critique + REWRITE: [The Staff Phrasing] + ACTION: [Step] (Effort: [L/M/H], Impact: [L/M/H])" }],
        "annotatedDefense": [{ "text": string, "type": "strength"|"weakness"|"qualifier", "feedback": "Critique + REWRITE: [The Staff Phrasing] + ACTION: [Step] (Effort: [L/M/H], Impact: [L/M/H])" }],
        "goldenPath": [{ "title": string, "content": string, "why": "The business logic.", "strategicTradeOffs": "What to reject explicitly." }],
        "rubricScores": [{ "category": string, "score": number, "reasoning": "Be precise and senior." }],
        "improvementItems": [{ "category": string, "action": string, "howTo": "Instead of [User], say [Staff]. Detailed step: [Specific instruction].", "whyItMatters": "Impact on leadership and second-order health.", "effort": "Low"|"Medium"|"High", "impact": "Low"|"Medium"|"High" }],
        "recommendedResources": [{ "title": string, "url": string, "type": "reading" }],
        "communicationAnalysis": { "tone": string, "confidenceScore": number, "clarityScore": number, "overallAssessment": "Strong"|"Average"|"Needs Work", "summary": "Focus on brevity and certainty." },
        "benchmarkResponse": "A perfect script including the follow-up defenses."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: followUpAudioBase64, mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });

    const data = this.extractJson(response.text);
    return { ...data, transcription: initialTranscript, followUpQuestions };
  }

  async verifyDeltaPractice(delta: ImprovementItem, audioBase64: string, mimeType: string): Promise<{ success: boolean; feedback: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Verify if the user successfully bridged this gap: "${delta.action}".
      Look for: Executive presence, removal of filler words, and precise PM terminology (e.g. 'cannibalization', 'LTV', 'moat', 'second-order effects').
      Return JSON: { "success": boolean, "feedback": "Critique focusing on high-level phrasing and precision." }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
      });
      return this.extractJson(response.text);
    } catch (e) {
      return { success: false, feedback: "Verification failed. Check mic settings." };
    }
  }
}

export const geminiService = new GeminiService();