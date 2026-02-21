
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
    
    const systemInstruction = `You are an Uncompromising VP of Product at a Tier-1 Tech Giant, evaluating candidates for Principal/Staff level Product Manager roles ($500k+ compensation band). Your bar is exceptionally high. Your feedback style is 'tough love' – surgically precise, logical, and devoid of generic platitudes. 

Your feedback MUST be hyper-actionable and granular. For every weakness identified, you must provide a concrete, step-by-step 'How-To' guide to fix it. Do not give generic advice. 

Every 'Improvement Item' MUST follow this format in the 'howTo' field:
1. PHASED STEPS: A numbered list of 3-4 specific tactical actions.
2. CONCRETE EXAMPLE: A "Before vs. After" comparison or a specific script ("Instead of saying X, say Y because...") that illustrates the improvement.
3. PRACTICE DRILL: A 5-minute exercise the candidate can do immediately.

Focus intensely on:
- Differentiating a truly elite Staff PM from a Senior PM (systemic thinking vs. execution).
- Strategic flexibility and adaptation during 'The Grill.'
- Synthesis of complex information and identification of critical trade-offs.
- Awareness of second-order effects and unintended consequences.

Every 'Improvement Item' MUST include estimated Effort and Impact ratings. Avoid framework mentions; focus on underlying leadership principles.`;

    const prompt = `
      EVALUATE FULL SESSION FOR ACTIONABLE GROWTH:
      
      CONTEXT:
      - Initial Question: "${question}"
      - Initial Response Transcript: "${initialTranscript}"
      
      "THE GRILL" (FOLLOW-UP CHALLENGES):
      ${followUpQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}
      
      AUDIO SOURCE: The attached audio contains the candidate's direct defense against these specific "Grill" questions.

      ANALYSIS MANDATE:
      1. CRITICAL DEFENSE EVALUATION: How did they handle the pressure? Did they pivot strategy effectively or double down on flaws?
      2. STAFF PM DIFFERENTIATION: Where was their thinking execution-only vs. systemic?
      3. EXECUTIVE PRESENCE: Logic consistency under fire.
      4. STRATEGIC FLEXIBILITY: Ability to iterate based on new constraints.
      5. SYSTEMIC DEPTH: Grasp of 2nd order effects.

      OUTPUT REQUIREMENTS:
      - overallScore: Critical rating 0-100.
      - benchmarkResponse: Gold-standard response for the whole session.
      - rubricScores: Logic-first category scores.
      - strengths/weaknesses: High-resolution signals.
      - improvementItems: For EVERY weakness, provide a concrete improvement item. Each MUST have:
          - action: The high-level objective.
          - whyItMatters: The strategic or Staff PM context.
          - howTo: A DETAILED, actionable step-by-step guide with concrete "Before/After" examples and specific scripts to practice.
          - effort/impact: Categorized as Low, Medium, or High.

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
                  howTo: { type: Type.STRING, description: "Numbered tactical steps + Concrete example script + Practice drill." },
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
