
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult } from "../types";
import { RUBRICS } from "../constants";

export class GeminiService {
  constructor() {}

  async analyzeResponse(
    type: InterviewType,
    question: string,
    audioBase64: string,
    mimeType: string,
    onStream?: (text: string) => void
  ): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const rubric = RUBRICS[type].join(", ");
    
    const productSenseInstruction = `Use industry standard rubrics for Product Sense interviews. As a technical reference, evaluate performance based on frameworks similar to: https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering (The Definitive Guide to Mastering the Product Sense Interview).`;

    const analyticalInstruction = `Use industry standard rubrics for Execution and Analytical PM interviews. As a technical reference, evaluate performance based on frameworks similar to: https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering-f81 (The Definitive Guide to Mastering the Execution Interview).`;

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
            text: `You are a world-class Product Management Interview Coach. 
            I have just answered an interview question. 
            Question Type: ${type}
            Question: "${question}"
            
            ${specificInstruction}

            Analyze my audio response and provide a detailed breakdown in JSON format.
            Include: transcription, overallScore (0-100), rubricScores (1-10 per item), communicationAnalysis, strengths, weaknesses, improvementItems (categorized: Structuring, Content, Delivery), and recommendedResources.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            transcription: { type: Type.STRING },
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
          required: [
            "overallScore", 
            "transcription", 
            "rubricScores", 
            "communicationAnalysis", 
            "strengths", 
            "weaknesses", 
            "improvementItems", 
            "recommendedResources"
          ]
        }
      }
    });

    return JSON.parse(response.text.trim()) as InterviewResult;
  }
}

export const geminiService = new GeminiService();
