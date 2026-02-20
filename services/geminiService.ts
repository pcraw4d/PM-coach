
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult } from "../types";
import { RUBRICS } from "../constants";

export class GeminiService {
  constructor() {}

  private extractJson(text: string): any {
    try {
      // Handle cases where the model wraps the response in markdown code blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse JSON from response", text);
      throw new Error("The AI returned an invalid response format. Please try again.");
    }
  }

  async analyzeResponse(
    type: InterviewType,
    question: string,
    audioBase64: string,
    mimeType: string
  ): Promise<InterviewResult> {
    // Re-initialize to ensure we use the most up-to-date key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const productSenseInstruction = `Use industry standard rubrics for Product Sense interviews. Evaluate performance based on frameworks similar to the ones used by top tech companies like Google and Meta. Focus on user-centricity and visionary thinking.`;
    const analyticalInstruction = `Use industry standard rubrics for Execution and Analytical PM interviews. Evaluate performance based on frameworks similar to the ones used by top tech companies like Google and Meta. Focus on metrics, trade-offs, and root-cause analysis.`;

    const specificInstruction = type === InterviewType.PRODUCT_SENSE ? productSenseInstruction : analyticalInstruction;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType
            }
          },
          {
            text: `You are an elite Product Management Interview Coach. Analyze this audio response.
            Type: ${type}
            Question: "${question}"
            
            ${specificInstruction}

            CRITICAL SCORING RULES:
            - overallScore: Must be an integer between 0 and 100.
            - rubricScores: For each category, 'score' MUST be an integer between 0 and 10. (e.g., 7 means 7/10).
            - communicationAnalysis: 'confidenceScore' and 'clarityScore' MUST be integers between 0 and 10.

            Provide a detailed breakdown in JSON format. 
            Include: overallScore, transcription, rubricScores (array of {category, score, reasoning}), communicationAnalysis (object with tone, confidenceScore, clarityScore, overallAssessment, summary), strengths (array), weaknesses (array), improvementItems (array of {category, action, effort, impact}), and recommendedResources (array of {title, url, type}).`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER, description: "Total score from 0-100" },
            transcription: { type: Type.STRING },
            rubricScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  score: { type: Type.NUMBER, description: "Score for this category from 0-10" },
                  reasoning: { type: Type.STRING }
                },
                required: ["category", "score", "reasoning"]
              }
            },
            communicationAnalysis: {
              type: Type.OBJECT,
              properties: {
                tone: { type: Type.STRING },
                confidenceScore: { type: Type.NUMBER, description: "0-10" },
                clarityScore: { type: Type.NUMBER, description: "0-10" },
                overallAssessment: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["tone", "confidenceScore", "clarityScore", "overallAssessment", "summary"]
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  action: { type: Type.STRING },
                  effort: { type: Type.STRING },
                  impact: { type: Type.STRING }
                },
                required: ["category", "action", "effort", "impact"]
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
            }
          },
          required: ["overallScore", "transcription", "rubricScores", "communicationAnalysis", "strengths", "weaknesses", "improvementItems", "recommendedResources"]
        }
      }
    });

    return this.extractJson(response.text);
  }
}

export const geminiService = new GeminiService();
