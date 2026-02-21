
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

  /**
   * Generates aggressive follow-up questions based on the initial transcript.
   * Focuses on Staff PM level critiques: probing for logical inconsistencies, 
   * surface-level thinking, and ignored technical/strategic risks.
   */
  async generateFollowUps(
    type: InterviewType,
    question: string,
    audioBase64: string,
    mimeType: string
  ): Promise<{ transcription: string; followUpQuestions: string[] }> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
      ROLE: You are an elite, uncompromising VP of Product at a Tier-1 tech company. 
      TASK:
      1. Transcribe the candidate's response to the initial question: "${question}".
      2. Identify 2-3 specific, difficult, and aggressive follow-up questions ("The Grill") based on their answer.

      CRITERIA FOR FOLLOW-UPS (STAFF PM LEVEL):
      - PROBE STRATEGIC ASSUMPTIONS: Tailor the questions to probe for the underlying strategic assumptions the candidate made. Don't let them hide behind vague "user-centricity."
      - FORCE EXPLICIT TRADE-OFFS: Demand they articulate the "losing side" of their proposal. If they picked A, why is the risk of NOT doing B acceptable?
      - PROBE LOGIC & INCONSISTENCY: Hunt for logical gaps, "magic wand" assumptions, or hand-waving in their proposed solution.
      - HUNT FOR SURFACE THINKING: Identify where the candidate stayed at the execution surface and push them into systemic/Staff-level territory (e.g., ecosystem impact, technical debt, or long-term moats).
      - RISKS: Specifically probe for ignored strategic or technical risks like market cannibalization, regulatory friction, or scalability bottlenecks.
      
      TONE: Peer-level, skeptical, and intensely focused on high-stakes business impact. Frame the questions as a Staff PM would be challenged by an executive.

      Return ONLY JSON in this format:
      {
        "transcription": "the full transcript...",
        "followUpQuestions": ["Skeptical strategic question 1?", "Logical challenge 2?"]
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: audioBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["transcription", "followUpQuestions"]
        }
      }
    });

    return this.extractJson(response.text);
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
    
    const systemInstruction = `You are an Uncompromising VP of Product at a Tier-1 Tech Giant, evaluating candidates for Principal/Staff level Product Manager roles ($500k+ compensation band). Your bar is exceptionally high. Your feedback style is 'tough love' – surgically precise, logical, and devoid of generic platitudes. Focus intensely on what differentiates a truly elite Staff PM from a Senior PM, specifically probing for strategic depth, systemic thinking, and executive presence. You must evaluate with extreme scrutiny how well the candidate adapts their initial strategy based on 'The Grill' follow-up questions; look for strategic flexibility and the ability to iterate and deepen their thinking under high pressure. You should place a heavy emphasis on the candidate's ability to synthesize complex information and identify critical strategic trade-offs, especially when faced with evolving requirements or market shifts. Look for deep awareness of second-order effects and potential unintended consequences of their proposed solutions. Avoid mentioning specific frameworks unless absolutely necessary for clarity, and instead, focus on the underlying principles of effective product leadership and execution. For every weakness identified, provide a concrete, high-resolution action item with estimated effort and impact, directly tied to advancing their skills to a Staff PM level.`;

    const prompt = `
      EVALUATE FULL SESSION FOR ACTIONABLE GROWTH:
      
      CONTEXT:
      - Initial Question: "${question}"
      - Initial Response Transcript: "${initialTranscript}"
      
      "THE GRILL" (FOLLOW-UP CHALLENGES):
      ${followUpQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
      
      AUDIO SOURCE: The attached audio contains the candidate's direct defense against these specific "Grill" questions.

      ANALYSIS MANDATE:
      1. CRITICAL DEFENSE EVALUATION: Analyze how effectively the candidate addressed the specific logical gaps or strategic risks raised in the "Grill" questions. Did they deepen their argument or retreat into vague generalities?
      2. STAFF PM DIFFERENTIATION: Identify specific moments where their thinking was merely "Senior" (execution-focused) vs. "Staff" (system-focused, considering 2nd/3rd order effects).
      3. EXECUTIVE PRESENCE: Evaluate their ability to maintain logical consistency and clarity under direct pressure.
      4. STRATEGIC FLEXIBILITY: Critically assess if the candidate was able to pivot or adapt their thinking when confronted with new constraints or risks presented in the follow-up questions.
      5. SYSTEMIC DEPTH: Evaluate the candidate's grasp of second-order effects and unintended consequences of their solution.

      OUTPUT REQUIREMENTS:
      - overallScore: Critical rating from 0-100.
      - benchmarkResponse: A gold-standard transcript for this question and its follow-ups.
      - rubricScores: Direct, logic-first analysis for each category.
      - communicationAnalysis: Critique of verbal signaling and executive presence during the defense.
      - strengths: Specific high-leverage signals observed across the entire session.
      - weaknesses: Critical logical or strategic gaps, especially those exposed during the follow-ups.
      - improvementItems: Concrete, high-resolution action items including specific 'howTo' (step-by-step implementation) and 'whyItMatters' (strategic significance).

      Provide the analysis in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: followUpAudioBase64, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.NUMBER },
            followUpTranscription: { type: Type.STRING },
            benchmarkResponse: { type: Type.STRING },
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
                overallAssessment: { type: Type.STRING, enum: ["Strong", "Average", "Needs Work"] },
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
                  howTo: { type: Type.STRING, description: "Detailed step-by-step instructions on how to practice or implement this improvement." },
                  whyItMatters: { type: Type.STRING, description: "Strategic context on why this specific skill is critical for Staff PM roles." },
                  effort: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
                  impact: { type: Type.STRING, enum: ["Low", "Medium", "High"] }
                },
                required: ["category", "action", "howTo", "whyItMatters", "effort", "impact"]
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
          required: ["overallScore", "followUpTranscription", "rubricScores", "communicationAnalysis", "strengths", "weaknesses", "improvementItems", "recommendedResources", "benchmarkResponse"]
        }
      }
    });

    const finalJson = this.extractJson(response.text);
    return {
      ...finalJson,
      transcription: initialTranscript,
      followUpQuestions
    };
  }
}

export const geminiService = new GeminiService();
