import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult, KnowledgeMission } from "../types.ts";

export class GeminiService {
  constructor() {}

  /**
   * Extremely robust JSON extraction.
   * Cleans non-printable characters, markdown fences, and isolates JSON structures.
   */
  private extractJson(text: string): any {
    if (!text) return null;
    
    try {
      // 1. Remove non-printable characters and control characters that break JSON.parse
      // This includes BOM markers and weird AI-generated whitespaces
      let cleaned = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
      
      // 2. Strip markdown code blocks
      cleaned = cleaned.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
      
      // 3. Find structural boundaries
      const firstArray = cleaned.indexOf('[');
      const firstObject = cleaned.indexOf('{');
      
      let startIdx = -1;
      let endIdx = -1;

      // Prioritize the structure that appears first
      if (firstArray !== -1 && (firstObject === -1 || firstArray < firstObject)) {
        startIdx = firstArray;
        endIdx = cleaned.lastIndexOf(']');
      } else if (firstObject !== -1) {
        startIdx = firstObject;
        endIdx = cleaned.lastIndexOf('}');
      }

      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        // Fallback: Just try parsing the whole thing if no obvious boundaries found
        return JSON.parse(cleaned);
      }

      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      
      // 4. Handle trailing commas which are a common AI output error
      const fixedJson = jsonCandidate.replace(/,\s*([\]}])/g, '$1');
      
      return JSON.parse(fixedJson);
    } catch (e) {
      console.error("GeminiService: Robust JSON extraction failed", { 
        error: e, 
        snippet: text.substring(0, 100),
        fullText: text 
      });
      return null;
    }
  }

  /**
   * Discovers recent high-quality PM content using Google Search grounding.
   */
  async discoverMissions(): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      Perform a Google Search for exactly 4 RECENT (last 4 months) high-value Product Management resources.
      SOURCES: Lenny's Newsletter, Exponent (YouTube), SVPG, Product Growth (Aakash Gupta), or Reforge.
      
      CATEGORIES TO FIND:
      1. [VIDEO] One Senior PM Mock Interview (Exponent/YouTube).
      2. [READING] One Strategic product thinking article.
      3. [READING] One Execution/Metrics article.
      4. [ANY] One trending AI Product Management piece.

      STRICT OUTPUT FORMAT:
      Return ONLY a JSON ARRAY. No conversation, no markdown fences.
      [
        {
          "id": "slug-id",
          "title": "Clear Title",
          "source": "Site Name",
          "url": "Valid HTTPS URL",
          "type": "READING" | "VIDEO" | "PODCAST",
          "summary": "1-sentence summary of value.",
          "xpAwarded": 50
        }
      ]
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature: 0.1 // Force deterministic output for JSON
        }
      });

      const text = response.text || "";
      const data = this.extractJson(text);

      if (data && Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id || `mission-${crypto.randomUUID()}`,
          title: item.title || "Untitled Insight",
          source: item.source || "Industry Expert",
          url: item.url || "#",
          type: (['READING', 'VIDEO', 'PODCAST'].includes(item.type) ? item.type : 'READING') as any,
          summary: item.summary || "Master advanced PM concepts with this resource.",
          xpAwarded: Number(item.xpAwarded) || 50
        }));
      }
      
      throw new Error("Parsed data was not a valid array");
    } catch (error) {
      console.warn("Mission discovery failed, deploying curated fallback", error);
      return [
        {
          id: 'fallback-lenny-strategy',
          title: "The Hierarchy of Engagement",
          source: "Lenny's Newsletter",
          url: "https://www.lennysnewsletter.com/p/the-hierarchy-of-engagement",
          type: 'READING',
          summary: "Essential reading for understanding user retention at a Staff PM level.",
          xpAwarded: 50
        },
        {
          id: 'fallback-exponent-mock',
          title: "Google PM Interview: Design a Parking Solution",
          source: "Exponent",
          url: "https://www.youtube.com/watch?v=S-t1W6N9x2c",
          type: 'VIDEO',
          summary: "A gold-standard demonstration of the Product Sense framework.",
          xpAwarded: 75
        },
        {
          id: 'fallback-cagan-purpose',
          title: "The Purpose of Product Teams",
          source: "Marty Cagan (SVPG)",
          url: "https://www.svpg.com/the-purpose-of-product-teams/",
          type: 'READING',
          summary: "Distinguish between feature teams and truly empowered product teams.",
          xpAwarded: 50
        }
      ];
    }
  }

  /**
   * Generates aggressive follow-up questions based on the initial transcript.
   */
  async generateFollowUps(
    type: InterviewType,
    question: string,
    audioBase64: string,
    mimeType: string
  ): Promise<{ transcription: string; followUpQuestions: string[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      ROLE: You are an elite, uncompromising VP of Product.
      TASK:
      1. Transcribe the candidate's response to: "${question}".
      2. Identify 2-3 aggressive, Staff-level follow-up questions to test their resilience.
      
      Return ONLY valid JSON:
      {
        "transcription": "...",
        "followUpQuestions": ["...", "..."]
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: audioBase64, mimeType } },
            { text: prompt }
          ]
        },
        config: { 
          responseMimeType: "application/json" 
        }
      });

      const data = this.extractJson(response.text);
      if (!data) throw new Error("Could not extract follow-up JSON");
      return data;
    } catch (err) {
      console.error("Follow-up generation failed", err);
      return {
        transcription: "Transcription failed, but please defend your position based on your previous answer.",
        followUpQuestions: [
          "What are the major strategic trade-offs of your proposed solution?",
          "How would you measure success for this initiative at a $100M ARR scale?"
        ]
      };
    }
  }

  /**
   * Final analysis taking into account both initial response and follow-up defense.
   */
  async analyzeFullSession(
    type: InterviewType,
    question: string,
    initialTranscript: string,
    followUpQuestions: string[],
    followUpAudioBase64: string,
    mimeType: string
  ): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `You are a VP of Product at a Tier-1 tech giant. Evaluate for a Staff PM role. 
    Feedback must be granular, aggressive, and actionable. 
    Every improvement item must include Phased Steps, Concrete Examples, and a Practice Drill.`;

    const prompt = `
      EVALUATE FULL SESSION:
      - Question: "${question}"
      - Initial Answer: "${initialTranscript}"
      - FOLLOW-UP DEFENSE: (Attached Audio)

      Provide a detailed JSON analysis with: overallScore (0-100), rubricScores, strengths, weaknesses, improvementItems, communicationAnalysis, and benchmarkResponse.
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: {
          parts: [
            { inlineData: { data: followUpAudioBase64, mimeType } },
            { text: prompt }
          ]
        },
        config: { 
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      const finalJson = this.extractJson(response.text);
      if (!finalJson) throw new Error("Final analysis JSON parsing failed");

      return {
        ...finalJson,
        transcription: initialTranscript,
        followUpQuestions
      };
    } catch (err) {
      console.error("Final analysis failed", err);
      throw err;
    }
  }
}

export const geminiService = new GeminiService();