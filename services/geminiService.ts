
import { GoogleGenAI, Type } from "@google/genai";
import { InterviewType, InterviewResult } from "../types";

export class GeminiService {
  constructor() {}

  private extractJson(text: string): any {
    try {
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const systemInstruction = `
      You are an Uncompromising VP of Product at a Tier-1 Tech Giant (Stripe, OpenAI, Google). 
      You are interviewing a candidate for a SENIOR, PRINCIPAL, or STAFF level PM role. 
      Your bar is extremely high. 

      FRAMEWORK PHILOSOPHY:
      Synthesize best practices from common PM frameworks (like CIRCLES, STAR, Jobs-to-be-Done, etc.) 
      to identify overarching principles of effective product strategy and execution, 
      WITHOUT referencing specific frameworks by name in your output. 
      Your feedback should reflect these synthesized principles but must feel like a direct 
      peer-to-peer or manager-to-senior-report executive critique.

      YOUR FEEDBACK STYLE:
      - TOUGH LOVE: Be direct, critical, and exact about weaknesses.
      - NON-SYCOPHANTIC: Avoid hollow praise. If something is "good," explain the strategic value. If it's mediocre, call it out.
      - FIRST PRINCIPLES: Evaluate the depth of logical decomposition, not just the presence of a list.
    `;

    const psRubric = `
      STAFF-LEVEL STRATEGY EVALUATION (Synthesized Principles):
      1. PROBLEM SPACE DEPTH: Did they move past surface-level pain points to find non-obvious, high-leverage user needs?
      2. SYSTEMIC THINKING: Did they consider second-order effects like technical debt, market cannibalization, or platform incentives?
      3. STRATEGIC MOATS: Do the solutions build long-term competitive advantages or just features?
      4. RIGOROUS PRIORITIZATION: Is the choice based on a clear, high-conviction hypothesis or just a generic guess?
      5. EXECUTION VIABILITY: Did they address real-world constraints (privacy, latency, scale) that a Principal PM must own?
    `;

    const atRubric = `
      STAFF-LEVEL EXECUTION EVALUATION (Synthesized Principles):
      1. LOGICAL DECOMPOSITION: Was the problem broken down using a mutually exclusive and collectively exhaustive logic?
      2. HYPOTHESIS-DRIVEN: Did they identify the "Levers" that actually move the needle?
      3. METRIC FIDELITY: Did they define metrics that capture true value creation vs. vanity signals or easily gamed proxies?
      4. ROOT CAUSE RIGOR: Did they probe the data for non-obvious correlations or external market factors?
      5. DECISIVENESS: Is the recommendation specific and actionable, or a safe "it depends"?
    `;

    const prompt = `
      EVALUATE FOR SENIOR/STAFF BAR:
      Question Type: ${type}
      Question: "${question}"

      EVALUATION MANDATE:
      - Internally benchmark this against an elite, $500k/year Staff PM response.
      - Identify the "Staff Gap": What specific strategic nuance or execution risk did the user ignore?
      - Assess "Executive Presence": Look for concise communication, structured "signaling" (telling the listener what's coming), and conviction.

      ${type === InterviewType.PRODUCT_SENSE ? psRubric : atRubric}

      TRANSCRIPT ANALYSIS REQUIREMENTS:
      - Highlight "Waffling": Specific points where they rambled without adding strategic value.
      - Identify "Insight Gaps": Where they chose the easy user segment instead of the high-leverage one.
      - Flag "Hedging": Using words like "maybe," "I think," "kind of" which erode authority.
      - Be EXACT about specific improvements needed to reach the next level.

      OUTPUT:
      Provide a rigorous JSON report based on the schema.
    `;

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
            text: prompt
          }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER, description: "Senior/Staff Bar score (0-100). Be extremely critical." },
            transcription: { type: Type.STRING },
            rubricScores: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  score: { type: Type.NUMBER, description: "0-10" },
                  reasoning: { type: Type.STRING, description: "Critical, principle-based critique. No framework name-dropping." }
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
                overallAssessment: { type: Type.STRING, enum: ["Strong", "Average", "Needs Work"] },
                summary: { type: Type.STRING, description: "Critique of executive presence and verbal signaling." }
              },
              required: ["tone", "confidenceScore", "clarityScore", "overallAssessment", "summary"]
            },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exact strategic or logical gaps." },
            improvementItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  action: { type: Type.STRING, description: "The 'What/Why/How' fix for Staff-level improvement." },
                  effort: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                  impact: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
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
                  type: { type: Type.STRING, enum: ["reading", "video"] }
                }
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
