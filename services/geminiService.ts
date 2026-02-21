import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult, KnowledgeMission } from "../types.ts";

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
        startIdx = firstArray;
        endIdx = cleaned.lastIndexOf(']');
      } else if (firstObject !== -1) {
        startIdx = firstObject;
        endIdx = cleaned.lastIndexOf('}');
      }
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return JSON.parse(cleaned);
      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      return JSON.parse(jsonCandidate.replace(/,\s*([\]}])/g, '$1'));
    } catch (e) {
      return null;
    }
  }

  async discoverMissions(): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `
      Perform a deep-link Google Search for exactly 4 RECENT (last 3 months) high-value Product Management resources.
      TODAY'S DATE: ${today}. Use this to find trending topics.
      
      Focus on SPECIFIC ARTICLES or VIDEOS, not landing pages.
      PREFERRED SOURCES: Lenny's Newsletter, SVPG, Exponent, Aakash Gupta, or Reforge.
      
      STRICT OUTPUT FORMAT (JSON ARRAY ONLY):
      [
        {
          "id": "unique-slug",
          "title": "Clear Title",
          "source": "Source Name",
          "url": "Direct HTTPS URL",
          "type": "READING" | "VIDEO" | "PODCAST",
          "summary": "1-sentence summary.",
          "xpAwarded": 50
        }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { tools: [{ googleSearch: {} }], temperature: 0.1 }
      });

      const data = this.extractJson(response.text || "");
      if (data && Array.isArray(data)) {
        return data.map((item: any) => ({
          id: item.id || `m-${crypto.randomUUID()}`,
          title: item.title || "PM Insight",
          source: item.source || "Industry",
          url: item.url || "#",
          type: item.type || 'READING',
          summary: item.summary || "Actionable PM wisdom.",
          xpAwarded: item.xpAwarded || 50
        }));
      }
      throw new Error("Invalid format");
    } catch (error) {
      return [
        { id: 'f-1', title: "The Hierarchy of Engagement", source: "Lenny's", url: "https://www.lennysnewsletter.com/p/the-hierarchy-of-engagement", type: 'READING', summary: "Understanding retention.", xpAwarded: 50 },
        { id: 'f-2', title: "Google PM Interview Mock", source: "Exponent", url: "https://www.youtube.com/watch?v=S-t1W6N9x2c", type: 'VIDEO', summary: "Product Sense framework.", xpAwarded: 75 }
      ];
    }
  }

  async generateFollowUps(type: InterviewType, question: string, audioBase64: string, mimeType: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `Transcribe response to "${question}" and identify 2 Staff-level aggressive follow-up questions. Return JSON: {transcription: string, followUpQuestions: string[]}`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return this.extractJson(response.text);
  }

  async analyzeFullSession(type: InterviewType, question: string, initialTranscript: string, followUpQuestions: string[], followUpAudioBase64: string, mimeType: string): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `EVALUATE FULL SESSION (Staff PM Bar): Q: ${question}, A1: ${initialTranscript}, Defense: (Audio attached). Return detailed JSON InterviewResult.`;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ inlineData: { data: followUpAudioBase64, mimeType } }, { text: prompt }] },
      config: { responseMimeType: "application/json" }
    });
    return { ...this.extractJson(response.text), transcription: initialTranscript, followUpQuestions };
  }
}

export const geminiService = new GeminiService();
