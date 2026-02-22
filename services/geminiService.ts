import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult, KnowledgeMission, ImprovementItem } from "../types.ts";

export class GeminiService {
  constructor() {}

  private extractJson(text: string): any {
    if (!text) return null;
    try {
      let cleaned = text.trim();
      
      // Remove potential markdown code blocks
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

      // Phase 5: Resilience for truncated JSON
      if (endIdx === -1 || endIdx <= startIdx) {
        console.warn("Detected truncated JSON, attempting repair...");
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
      console.error("JSON Extraction failed. Raw text snippet:", text.substring(0, 100));
      return null;
    }
  }

  // Phase 5: Exponential Backoff Wrapper
  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  async discoverMissions(): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Search for 4 RECENT high-value PM resources from top firms (Lenny's, SVPG, Reforge). Return JSON array: [{id, title, source, url, type, summary, xpAwarded}]`;
    
    try {
      return await this.withRetry(async () => {
        const response = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          contents: prompt,
          config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
        });
        return this.extractJson(response.text || "") || [];
      });
    } catch (error) {
      console.error("Mission discovery failed after retries", error);
      return [];
    }
  }

  async generateFollowUps(type: InterviewType, question: string, audioBase64: string, mimeType: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Transcribe response to "${question}" and identify 2 Staff-level aggressive follow-up questions. JSON: {transcription: string, followUpQuestions: string[]}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return this.extractJson(response.text);
  }

  async analyzeFullSession(type: InterviewType, question: string, initialTranscript: string, followUpQuestions: string[], followUpAudioBase64: string, mimeType: string): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      AUDIT FULL PM INTERVIEW (Staff Level Bar).
      Q: ${question}
      P1 (Vision): ${initialTranscript}
      P2 (The Grill): ${followUpQuestions.join(', ')}
      
      STRICT JSON STRUCTURE REQUIREMENTS:
      {
        "overallScore": number,
        "visionScore": number,
        "defenseScore": number,
        "userLogicPath": "Briefly name the framework user used",
        "defensivePivotScore": number(0-10),
        "defensivePivotAnalysis": "Check consistency between Vision & Defense.",
        "followUpTranscription": string,
        "annotatedVision": [{ "text": string, "type": "strength"|"weakness"|"qualifier"|"neutral", "feedback": "MUST include 'REWRITE: [Staff-level phrasing]'" }],
        "annotatedDefense": [{ "text": string, "type": "strength"|"weakness"|"qualifier"|"neutral", "feedback": "MUST include 'REWRITE: [Staff-level phrasing]'" }],
        "goldenPath": [{ 
          "title": string, 
          "content": string, 
          "why": "Rationale.", 
          "strategicTradeOffs": "What was REJECTED and why." 
        }],
        "rubricScores": [{ "category": string, "score": number, "reasoning": string }],
        "improvementItems": [{ 
          "category": string, 
          "action": string, 
          "howTo": "MANDATORY: Comparison guide. Instead of Generic, say Staff Precision.", 
          "whyItMatters": string, 
          "effort": "Low"|"Medium"|"High", 
          "impact": "Low"|"Medium"|"High" 
        }],
        "recommendedResources": [{ "title": string, "url": string, "type": "reading"|"video" }],
        "communicationAnalysis": { "tone": string, "confidenceScore": number, "clarityScore": number, "overallAssessment": "Strong"|"Average"|"Needs Work", "summary": string },
        "benchmarkResponse": "Format as a script: [Staff PM]: ... [Commentary]: ..."
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
      Verify specific PM improvement: "${delta.action}".
      Guide: ${delta.howTo}
      Return JSON: { "success": boolean, "feedback": "Constructive critique on phrasing." }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
      });
      return this.extractJson(response.text);
    } catch (e) {
      return { success: false, feedback: "Verification timed out. Keep your response under 45 seconds." };
    }
  }
}

export const geminiService = new GeminiService();