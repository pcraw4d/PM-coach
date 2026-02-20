
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
    // Fix: Initialization follows the requirement to use process.env.API_KEY directly.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const rubric = RUBRICS[type].join(", ");
    
    const productSenseInstruction = `Use industry standard rubrics for Product Sense interviews. As a technical reference, evaluate performance based on frameworks similar to: https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering (The Definitive Guide to Mastering the Product Sense Interview).
         Ensure the feedback evaluates how well the user clarified the mission, identified diverse user segments, picked a high-impact pain point, 
         brainstormed creative solutions (10x thinking), and discussed trade-offs/metrics.`;

    const analyticalInstruction = `Use industry standard rubrics for Execution and Analytical PM interviews. As a technical reference, evaluate performance based on frameworks similar to: https://www.lennysnewsletter.com/p/the-definitive-guide-to-mastering-f81 (The Definitive Guide to Mastering the Execution Interview).
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

            Please analyze my audio response based on the following:
            1. Rubric items: ${rubric}.
            2. Communication quality: Evaluate my tone, confidence, and clarity of speech.
            
            Provide a detailed score and breakdown in JSON format.
            
            Include:
            1. Full transcription.
            2. Overall score (0-100).
            3. Rubric scores (1-10) with reasoning.
            4. Communication Analysis: A high-level evaluation of 'tone', 'confidenceScore' (1-10), 'clarityScore' (1-10), an 'overallAssessment' (Strong, Average, Needs Work), and a brief 'summary' of the soft skills performance.
            5. Bullet points for key Strengths and Weaknesses.
            6. A list of improvement items. IMPORTANT: Each item MUST be categorized as either 'Structuring', 'Content', or 'Delivery'.
            7. Specific learning resources.`
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
                  category: { 
                    type: Type.STRING,
                    description: "Must be one of: Structuring, Content, or Delivery" 
                  },
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
                  type: { type: Type.STRING, description: "Must be 'reading' or 'video'" }
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
