
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult } from "../types";
import { RUBRICS } from "../constants";

export class GeminiService {
  constructor() {}

  async analyzeResponse(
    type: InterviewType,
    question: string,
    audioBase64: string,
    mimeType: string
  ): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const rubric = RUBRICS[type].join(", ");
    
    // Explicit instructions for Product Sense based on the Lenny's Newsletter reference
    const productSenseInstruction = `Use this specific guide as your reference framework for analysis: https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering (The Definitive Guide to Mastering the Product Sense Interview).
         Ensure the feedback evaluates how well the user clarified the mission, identified diverse user segments, picked a high-impact pain point, 
         brainstormed creative solutions (10x thinking), and discussed trade-offs/metrics.`;

    const analyticalInstruction = `Use this specific guide as your reference framework for analysis: https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering-f81 (The Definitive Guide to Mastering the Execution Interview).
         Ensure the feedback evaluates how well the user structured their investigation, applied root cause analysis (for troubleshooting questions), 
         defined North Star and counter-metrics (for goal-setting questions), and analyzed strategic trade-offs.`;

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

            Please analyze my audio response based on the following rubric: ${rubric}.
            Provide a detailed score and breakdown. 
            
            Include:
            1. Full transcription of my response.
            2. An overall score (0-100).
            3. Scores (1-10) for each rubric item with reasoning.
            4. Bullet points for key Strengths and Weaknesses.
            5. Recommendations for improvement.
            6. Specific learning resources (YouTube links or book titles), specifically looking for Lenny's Newsletter, Jackie Bavaro, or Shreyas Doshi content if relevant.`
          }
        ]
      },
      config: {
        tools: [{ googleSearch: {} }],
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
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvementAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  url: { type: Type.STRING },
                  type: { type: Type.STRING, description: "Must be 'reading' or 'video'" }
                },
                required: ["title", "url", "type"]
              }
            }
          },
          required: ["overallScore", "transcription", "rubricScores", "strengths", "weaknesses", "improvementAreas", "recommendedResources"]
        }
      }
    });

    return JSON.parse(response.text.trim()) as InterviewResult;
  }
}

export const geminiService = new GeminiService();
