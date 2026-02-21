import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult, KnowledgeMission, ImprovementItem } from "../types.ts";

export class GeminiService {
  constructor() {}

  private extractJson(text: string): any {
    if (!text) return null;
    try {
      let cleaned = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
      cleaned = cleaned.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      const firstArray = cleaned.indexOf('[');
      const firstObject = cleaned.indexOf('{');
      let startIdx = -1;
      let endIdx = -1;
      if (firstArray !== -1 && (firstObject === -1 || firstArray < firstObject)) {
        startIdx = firstArray; endIdx = cleaned.lastIndexOf(']');
      } else if (firstObject !== -1) {
        startIdx = firstObject; endIdx = cleaned.lastIndexOf('}');
      }
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return JSON.parse(cleaned);
      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonCandidate.replace(/,\s*([\]}])/g, '$1'));
    } catch (e) {
      console.error("JSON Extraction failed", e);
      return null;
    }
  }

  async discoverMissions(): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Search for 4 RECENT (last 3 months) high-value PM resources from top firms or thought leaders. Return JSON array: [{id, title, source, url, type, summary, xpAwarded}]`;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
      });
      return this.extractJson(response.text || "");
    } catch (error) {
      return [];
    }
  }

  async generateFollowUps(type: InterviewType, question: string, audioBase64: string, mimeType: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Transcribe response to "${question}" and identify 2 Staff-level aggressive follow-up questions that challenge the user's assumptions or lack of metrics. JSON: {transcription: string, followUpQuestions: string[]}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
        "userLogicPath": "Briefly name the framework user used (e.g. 'Ad-hoc prioritizing', 'Light CIRCLES')",
        "defensivePivotScore": number(0-10),
        "defensivePivotAnalysis": "Check consistency between Vision & Defense. Did they contradict themselves or cave under pressure?",
        "followUpTranscription": string,
        "annotatedVision": [{ "text": string, "type": "strength"|"weakness"|"qualifier"|"neutral", "feedback": "For weaknesses, MUST include 'REWRITE: [Staff-level alternative phrasing]'" }],
        "annotatedDefense": [{ "text": string, "type": "strength"|"weakness"|"qualifier"|"neutral", "feedback": "For weaknesses, MUST include 'REWRITE: [Staff-level alternative phrasing]'" }],
        "goldenPath": [{ 
          "title": string, 
          "content": string, 
          "why": "Strategic rationale.", 
          "strategicTradeOffs": "CRITICAL: Explicitly list what was REJECTED (e.g. 'We ignored the high-intent niche to focus on top-of-funnel reach') and the trade-off (e.g. 'Sacrificing early ARPU for long-term LTV')." 
        }],
        "rubricScores": [{ "category": string, "score": number, "reasoning": string }],
        "improvementItems": [{ 
          "category": string, 
          "action": string, 
          "howTo": "MANDATORY: Provide a multi-step guide (1. 2. 3.). For each step, provide a comparison: 'PHRASING: Instead of \"[generic user phrase]\", say \"[Staff PM precision phrase]\"' to demonstrate exactly how to implement the change.", 
          "whyItMatters": string, 
          "effort": "Low"|"Medium"|"High", 
          "impact": "Low"|"Medium"|"High" 
        }],
        "recommendedResources": [{ "title": string, "url": string, "type": "reading"|"video" }],
        "communicationAnalysis": { "tone": string, "confidenceScore": number, "clarityScore": number, "overallAssessment": "Strong"|"Average"|"Needs Work", "summary": string },
        "benchmarkResponse": "Format as a script: [Staff PM]: (Logic...) [Commentary]: (Why...)"
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
      The user is practicing this specific PM improvement: "${delta.action}".
      Delta Context: ${delta.whyItMatters}
      Execution Guide: ${delta.howTo}
      
      Verify if the user implemented the specific phrases and steps provided in the guide.
      Return JSON: { "success": boolean, "feedback": "Be brutally honest but constructive. Did they use the recommended Staff-level phrasing?" }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
      });
      return this.extractJson(response.text);
    } catch (e) {
      return { success: false, feedback: "We couldn't verify this attempt. Please try again." };
    }
  }
}

export const geminiService = new GeminiService();