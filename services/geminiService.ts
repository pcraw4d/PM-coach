import { GoogleGenAI, Type, GenerateContentResponse, ThinkingLevel } from "@google/genai";
import { InterviewType, InterviewResult, KnowledgeMission, ImprovementItem, AggregatedWeaknessProfile } from "../types.ts";
import { GOLDEN_PATH_PRODUCT_SENSE, GOLDEN_PATH_ANALYTICAL, RUBRIC_DEFINITIONS, getSearchQueriesForWeaknesses } from '../constants.tsx';

// Update model names here when Google releases new versions
// Current models: https://ai.google.dev/gemini-api/docs/models
const MODEL_CONFIG = {
  TRANSCRIPTION: 'gemini-3-flash-preview',
  FOLLOW_UP: 'gemini-3-flash-preview',
  ANALYSIS_PRIMARY: 'gemini-3.1-pro-preview',
  ANALYSIS_FALLBACK: 'gemini-3-flash-preview',
  MISSIONS: 'gemini-2.5-flash-lite',
  DELTA_VERIFY: 'gemini-3-flash-preview',
  EXTRACTION: 'gemini-3-flash-preview',
  EXTRACTION_FALLBACK: 'gemini-3-flash-preview'
} as const;

interface TranscriptExtraction {
  frameworks: Array<{
    quote: string;       // verbatim words used
    framework: string;   // name of the framework e.g. "MECE", 
                         // "Jobs To Be Done", "Rule of Three"
    usedCorrectly: boolean;
  }>;
  metrics: Array<{
    quote: string;       // verbatim words used
    metricType: string;  // e.g. "North Star", "guardrail", 
                         // "vanity", "proxy"
    isQuantified: boolean;
  }>;
  claims: Array<{
    quote: string;       // verbatim claim
    category: string;    // e.g. "user insight", "prioritization 
                         // rationale", "MVP scope", "trade-off",
                         // "second-order effect", "recommendation"
    hasEvidence: boolean; // did the candidate back it with data 
                          // or reasoning?
  }>;
  weaknesses: Array<{
    quote: string;       // verbatim words
    issueType: string;   // e.g. "hedging language", "vague claim",
                         // "unsupported assumption", "skipped step",
                         // "wrong framework application", 
                         // "vanity metric"
    severity: 'minor' | 'moderate' | 'critical';
  }>;
  strengths: Array<{
    quote: string;       // verbatim words
    strengthType: string; // e.g. "precise quantification", 
                          // "executive framing", "MECE structure",
                          // "company moat insight", 
                          // "second-order awareness"
  }>;
  hedgingInstances: string[]; // every verbatim hedging phrase found
  structureSignals: Array<{
    quote: string;
    signalType: string;  // e.g. "framework opening", 
                         // "explicit transition", 
                         // "bottom-line-up-front", 
                         // "executive summary"
  }>;
  missingElements: string[]; // Staff-level elements entirely 
                              // absent from the response
}

class RateLimitedQueue {
  private queue: Array<() => Promise<unknown>> = [];
  private activeCount = 0;
  private readonly maxConcurrent: number;
  private readonly minDelayMs: number;
  private lastCallTime = 0;

  constructor(maxConcurrent = 2, minDelayMs = 500) {
    // maxConcurrent: max simultaneous in-flight API calls
    // minDelayMs: minimum gap between any two API calls firing
    this.maxConcurrent = maxConcurrent;
    this.minDelayMs = minDelayMs;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result as T);
        } catch (err) {
          reject(err);
        }
      });
      this.process();
    });
  }

  private async process(): Promise<void> {
    if (this.activeCount >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    const now = Date.now();
    const timeSinceLast = now - this.lastCallTime;
    
    if (timeSinceLast < this.minDelayMs) {
      setTimeout(
        () => this.process(), 
        this.minDelayMs - timeSinceLast
      );
      return;
    }

    const fn = this.queue.shift();
    if (!fn) return;

    this.activeCount++;
    this.lastCallTime = Date.now();

    try {
      await fn();
    } finally {
      this.activeCount--;
      this.process();
    }
  }
}

// Single shared queue instance for all Gemini Flash calls.
// Pro calls bypass the queue since they are infrequent.
const flashQueue = new RateLimitedQueue(2, 500);

function parseGeminiError(err: unknown): { 
  is429: boolean;
  is503: boolean;
  isQuotaExhausted: boolean;
  isModelDeprecated: boolean;
  retryAfterMs: number | null;
} {
  const defaultResult = { 
    is429: false, 
    is503: false,
    isQuotaExhausted: false, 
    isModelDeprecated: false,
    retryAfterMs: null 
  };

  if (!err || typeof err !== 'object') return defaultResult;

  const message = 
    (err as { message?: string }).message || 
    JSON.stringify(err);
  
  const status = (err as { status?: number }).status;

  const is429 = 
    message.includes('429') || 
    status === 429;

  const is503 = 
    message.includes('503') || 
    status === 503;
    
  // Detect model deprecation (404 Not Found for model resource)
  const isModelDeprecated = 
    (status === 404 || message.includes('404')) && 
    (message.includes('model') || message.includes('no longer available') || message.includes('not found'));

  if (!is429 && !is503 && !isModelDeprecated) return defaultResult;

  // Detect fully exhausted daily quota — limit: 0 means no 
  // requests are available and waiting will not help until 
  // the quota resets at midnight
  const isQuotaExhausted = message.includes('"limit": 0') || 
    message.includes('limit: 0') ||
    message.includes('GenerateRequestsPerDayPerProject');

  // Extract retryDelay from the API error response body.
  // Format is either "50s" or "50.497441097s"
  let retryAfterMs: number | null = null;
  const retryDelayMatch = message.match(/"retryDelay"\s*:\s*"([\d.]+)s"/);
  if (retryDelayMatch) {
    const seconds = parseFloat(retryDelayMatch[1]);
    // Add 2 second buffer on top of the API-specified delay
    retryAfterMs = Math.ceil(seconds * 1000) + 2000;
  }

  return { is429, is503, isQuotaExhausted, isModelDeprecated, retryAfterMs };
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    label?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 2000,
    maxDelayMs = 30000,
    label = 'API call'
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;

      const { is429, is503, isQuotaExhausted, isModelDeprecated, retryAfterMs } = 
        parseGeminiError(err);

      // Model deprecation — retrying will not help.
      if (isModelDeprecated) {
        console.error(
          `[geminiService] ${label} — model deprecated or not found.`
        );
        throw new Error(
          'MODEL_DEPRECATED: The configured AI model is no longer available. ' +
          'Please contact the developer to update the model version.'
        );
      }

      // Daily quota exhausted — retrying will not help.
      // Fail immediately and surface a clear error.
      if (isQuotaExhausted) {
        console.error(
          `[geminiService] ${label} — daily quota exhausted. ` +
          `No retries attempted. Quota resets at midnight Pacific.`
        );
        throw new Error(
          'QUOTA_EXHAUSTED: Daily API quota has been reached. ' +
          'Please try again tomorrow or upgrade your Google AI ' +
          'API plan at https://ai.dev/rate-limit'
        );
      }

      const isRetryable =
        is429 ||
        is503 ||
        (err instanceof Error && (
          err.message.includes('500') ||
          err.message.includes('503') ||
          err.message.toLowerCase().includes('timeout')
        ));

      if (!isRetryable || attempt === maxRetries) {
        console.error(
          `[geminiService] ${label} failed permanently ` +
          `after ${attempt + 1} attempt(s):`, err
        );
        throw err;
      }

      // Use API-specified retry delay if available.
      // Otherwise fall back to exponential backoff.
      const delay = retryAfterMs ?? Math.min(
        (is429 ? baseDelayMs * 3 : baseDelayMs) * 
          Math.pow(2, attempt) + 
          Math.random() * 1000,
        maxDelayMs
      );

      console.warn(
        `[geminiService] ${label} attempt ${attempt + 1} failed ` +
        `${is429 ? '(rate limited)' : is503 ? '(service unavailable)' : '(error)'}. ` +
        `Waiting ${Math.round(delay / 1000)}s ` +
        `${retryAfterMs ? '(API-specified delay)' : '(backoff)'}...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

async function extractTranscriptSignals(
  ai: GoogleGenAI,
  transcript: string,
  label: string = 'transcript'
): Promise<TranscriptExtraction | null> {
  
  const wordCount = transcript.trim().split(/\s+/).length;
  console.log(
    `[geminiService] Starting extraction pass for ${label}: 
    ${wordCount} words`
  );

  const extractionPrompt = `
You are a Staff PM interview analyst performing a structured 
extraction pass on a candidate's interview transcript. Your job 
is NOT to score or evaluate — only to extract and categorize 
every meaningful moment from the transcript into structured JSON.

EXTRACTION RULES:
- Every quote must be verbatim — copy the exact words from the 
  transcript, do not paraphrase or clean up
- Quotes should be 5-40 words — long enough to be meaningful, 
  short enough to be precise
- Extract comprehensively — it is better to over-extract than 
  to miss a moment. Aim for at least 6-10 items per category 
  where the content supports it
- If the candidate never mentioned something (e.g. never named 
  a framework), leave that array empty
- missingElements should list Staff-level behaviors that are 
  entirely absent from the response (e.g. "No success metric 
  defined", "No MVP scope stated", "No guardrail metric", 
  "No second-order effects addressed")

TRANSCRIPT:
${transcript}

Return only valid JSON matching this exact structure with no 
preamble or commentary:
{
  "frameworks": [],
  "metrics": [],
  "claims": [],
  "weaknesses": [],
  "strengths": [],
  "hedgingInstances": [],
  "structureSignals": [],
  "missingElements": []
}`;

  try {
    const response = await flashQueue.add(() =>
      retryWithBackoff(
        () => ai.models.generateContent({
          model: MODEL_CONFIG.EXTRACTION,
          contents: extractionPrompt,
          config: { responseMimeType: 'application/json' }
        }),
        { label: `extractTranscriptSignals — ${label}` }
      )
    );
    
    const raw = response.text || "";
    const parsed = JSON.parse(raw) as TranscriptExtraction;
    
    console.log(
      `[geminiService] Extraction complete for ${label}: ` +
      `${parsed.strengths.length} strengths, ` +
      `${parsed.weaknesses.length} weaknesses, ` +
      `${parsed.missingElements.length} missing elements`
    );
    
    return parsed;
    
  } catch (err) {
    console.error(
      `[geminiService] Extraction failed for ${label}:`, err
    );
    // Return null — the caller will fall back to passing the 
    // full transcript directly if extraction fails
    return null;
  }
}

export class GeminiService {
  constructor() {}

  private extractJson(text: string): any {
    if (!text) return null;

    // Strategy 1: Look for markdown code blocks.
    // We prefer the last block as it's likely the final answer (e.g. after reasoning).
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    const matches = [...text.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      // Try from the last block backwards
      for (let i = matches.length - 1; i >= 0; i--) {
        try {
          const content = matches[i][1].trim();
          // Basic sanitization for trailing commas
          const sanitized = content.replace(/,\s*([\]}])/g, '$1');
          return JSON.parse(sanitized);
        } catch (e) {
          // Continue to next block if this one fails
          continue;
        }
      }
    }

    // Strategy 2: Fallback to finding the outermost JSON structure
    try {
      let cleaned = text.trim();
      // Remove code fences if they exist but weren't caught by regex (unlikely but safe)
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
      
      if (startIdx === -1) {
        console.error("[GeminiService] No JSON structure found in text:", text);
        return null;
      }

      // If we found a start but the end is weird or missing
      if (endIdx === -1 || endIdx <= startIdx) {
        let fragment = cleaned.substring(startIdx);
        // Attempt to close open structures (heuristic)
        const openBraces = (fragment.match(/{/g) || []).length;
        const closeBraces = (fragment.match(/}/g) || []).length;
        const openBrackets = (fragment.match(/\[/g) || []).length;
        const closeBrackets = (fragment.match(/]/g) || []).length;
        for (let i = 0; i < (openBrackets - closeBrackets); i++) fragment += ']';
        for (let i = 0; i < (openBraces - closeBraces); i++) fragment += '}';
        try {
          return JSON.parse(fragment);
        } catch (e) {
          console.error("[GeminiService] Failed to parse JSON fragment:", fragment, e);
          return null;
        }
      }
      
      const jsonCandidate = cleaned.substring(startIdx, endIdx + 1);
      const sanitized = jsonCandidate.replace(/,\s*([\]}])/g, '$1');
      return JSON.parse(sanitized);
    } catch (e) {
      console.error("[GeminiService] JSON extraction failed. Raw text:", text, e);
      return null;
    }
  }

  /**
   * PASS 1: Transcription using Flash. 
   * Optimized for large audio files (up to 30 mins) where latency and cost-efficiency matter most.
   */
  async transcribeAudio(audioBase64: string, mimeType: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = "Transcribe this audio exactly. Do not add any commentary. Ensure highly technical PM terminology is captured precisely.";
    
    const response = await flashQueue.add(() =>
      retryWithBackoff(
        () => ai.models.generateContent({
          model: MODEL_CONFIG.TRANSCRIPTION,
          contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] }
        }),
        { label: 'transcribeAudio — transcription' }
      )
    );
    
    return response.text || "";
  }

  async discoverMissions(weaknessProfile?: AggregatedWeaknessProfile): Promise<KnowledgeMission[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    let prompt = "";
    
    if (weaknessProfile && weaknessProfile.topWeaknesses.length >= 2) {
       // Targeted Discovery
       const topWeaknesses = weaknessProfile.topWeaknesses.slice(0, 2);
       const categories = topWeaknesses.map(w => w.category);
       const searchQueries = getSearchQueriesForWeaknesses(categories);

       prompt = `
  Search the web for high-quality Product Management learning content specifically addressing these skill gaps:
  ${categories.join(", ")}

  Use these search queries to find the best resources:
  ${searchQueries.map(q => `- ${q}`).join("\n")}

  Focus on "Timeless", "Seminal", and "High-Signal" content. Do not prioritize recent news; prioritize quality and authority.

  Primary Sources (but not limited to):
  - Lenny's Newsletter (lennysnewsletter.com)
  - SVPG (svpg.com)
  - Reforge (reforge.com)
  - First Round Review (review.firstround.com)
  - Shreyas Doshi (Substack, LinkedIn, Twitter)
  - Mind the Product (mindtheproduct.com)
  - Product Coalition (productcoalition.com)
  - Bring the Donuts (ken-norton.com)
  - Department of Product (departmentofproduct.com)
  - Andrew Chen (andrewchen.com)

  CRITICAL URL RULES:
  1. You MUST use the EXACT URL returned by the Google Search tool.
  2. Do NOT construct, guess, or predict URLs based on titles.
  3. If you cannot find a verified, accessible URL for a resource, DO NOT include it.
  4. 404 errors are unacceptable. Verify the URL exists in your search results.

  Return a JSON array of exactly 4 objects.
  CRITICAL: Return ONLY the JSON array. Do not include any conversational text, markdown formatting, or explanations.

  Each object must have:
  - id: lowercase-hyphenated slug max 40 chars, e.g. "lennys-metrics-framework"
  - title: exact article or episode title
  - source: publication name as it appears on the site
  - url: the exact verified URL from your search
  - type: exactly one of "article", "video", or "podcast"
  - summary: 2-3 sentences describing the core PM insight a practitioner would take away
  - xpAwarded: integer between 25 and 50. Use 50 for long-form strategic pieces, 25 for shorter reads
  - targetedSkill: (Optional) The specific weakness category this content addresses (e.g. "${categories[0]}")
`;
    } else {
       // Generic Discovery (Fallback)
       prompt = `
  Search the web for the highest-quality, most definitive Product Management learning content available.
  
  Focus on "Timeless", "Seminal", and "High-Signal" content. Do not prioritize recent news; prioritize quality and authority.

  Primary Sources (but not limited to):
  - Lenny's Newsletter (lennysnewsletter.com)
  - SVPG (svpg.com)
  - Reforge (reforge.com)
  - First Round Review (review.firstround.com)
  - Shreyas Doshi (Substack, LinkedIn, Twitter)
  - Mind the Product (mindtheproduct.com)
  - Product Coalition (productcoalition.com)
  - Bring the Donuts (ken-norton.com)
  - Department of Product (departmentofproduct.com)
  - Andrew Chen (andrewchen.com)

  CRITICAL URL RULES:
  1. You MUST use the EXACT URL returned by the Google Search tool.
  2. Do NOT construct, guess, or predict URLs based on titles.
  3. If you cannot find a verified, accessible URL for a resource, DO NOT include it.
  4. 404 errors are unacceptable. Verify the URL exists in your search results.

  Return a JSON array of exactly 4 objects.
  CRITICAL: Return ONLY the JSON array. Do not include any conversational text, markdown formatting, or explanations.

  Each object must have:
  - id: lowercase-hyphenated slug max 40 chars, e.g. "lennys-metrics-framework"
  - title: exact article or episode title
  - source: publication name as it appears on the site
  - url: the exact verified URL from your search
  - type: exactly one of "article", "video", or "podcast"
  - summary: 2-3 sentences describing the core PM insight a practitioner would take away
  - xpAwarded: integer between 25 and 50. Use 50 for long-form strategic pieces, 25 for shorter reads
`;
    }
    
    try {
      const response = await flashQueue.add(() =>
        retryWithBackoff(
          () => ai.models.generateContent({
            model: MODEL_CONFIG.MISSIONS,
            contents: prompt,
            config: { 
              tools: [{ googleSearch: {} }], 
              temperature: 0.1
            }
          }),
          { label: 'discoverMissions — search' }
        )
      );
      
      const missions = this.extractJson(response.text || "") || [];
      
      // Extract grounded URLs from metadata to validate
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const groundedUrls = new Set<string>();
      
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri) {
          groundedUrls.add(chunk.web.uri);
        }
      });

      const validMissions = missions.filter((m: any) => {
        if (!m.url || typeof m.url !== 'string') return false;
        if (!m.url.startsWith('https://')) return false;
        if (m.url.length < 15) return false;
        if (/[^a-zA-Z0-9\-/.?=&:]/.test(m.url)) return false;
        
        // Strict Validation: The URL must be present in the grounding metadata
        // or at least be a substring of a grounded URL (to handle query params/fragments)
        // If no grounding metadata is returned (rare but possible), we fall back to basic validation
        if (groundedUrls.size > 0) {
           const isGrounded = Array.from(groundedUrls).some(gUrl => 
             gUrl.includes(m.url) || m.url.includes(gUrl)
           );
           if (!isGrounded) {
             console.warn(`[GeminiService] Filtered ungrounded URL: ${m.url}`);
             return false;
           }
        }

        return true;
      });

      return validMissions.map((m: any) => ({
        ...m,
        xpAwarded: typeof m.xpAwarded === 'number' && !isNaN(m.xpAwarded) 
          ? Math.max(25, Math.min(50, m.xpAwarded)) 
          : Math.floor(Math.random() * 26) + 25
      }));
    } catch (error) {
      return [];
    }
  }

  async generateFollowUps(type: InterviewType, question: string, transcript: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    const prompt = type === InterviewType.PRODUCT_SENSE 
      ? `
  You are a Staff PM conducting a bar-raiser interview panel.
  
  The candidate answered this question:
  "${question}"
  
  Their exact response was:
  "${transcript}"
  
  Generate exactly 2 follow-up questions that:
  1. Quote or directly reference a specific claim the candidate made
  2. Force them to defend that claim or reveal an unexamined assumption
  3. Are open-ended — never yes/no questions
  4. Target the highest-priority gap from this list based on what 
     is MISSING or WEAKEST in their response:
     - They did not define a clear business goal before jumping to 
       users or features
     - Their chosen user segment lacks behavioral specificity
     - Their solution is generic and does not leverage company moat
     - They did not define a testable MVP with isolated risk
     - They ignored second-order effects or cannibalization
     - Their success metric is a vanity metric
  5. Sound like a real interviewer, not a rubric checklist
  
  Format each question as a single direct sentence. Do not number 
  them or add preamble.
`
        : `
  You are a Staff PM conducting a bar-raiser interview panel.
  
  The candidate answered this question:
  "${question}"
  
  Their exact response was:
  "${transcript}"
  
  Generate exactly 2 follow-up questions that:
  1. Quote or directly reference a specific claim the candidate made
  2. Force them to defend their analytical logic or reveal a gap
  3. Are open-ended — never yes/no questions
  4. Target the highest-priority gap from this list based on what 
     is MISSING or WEAKEST in their response:
     - Their root cause framework was not MECE — they missed an 
       entire category (internal vs external, data vs product)
     - Their North Star metric is a vanity metric or lacks a guardrail
     - They did not address how optimizing their metric harms another
     - They confused absolute growth with incremental lift
     - Their hypothesis cannot be validated without a full A/B test 
       when a cheaper method exists
     - They made a recommendation without a clear decision framework
  5. Sound like a real interviewer, not a rubric checklist
  
  Format each question as a single direct sentence. Do not number 
  them or add preamble.
`;

    const response = await flashQueue.add(() =>
      retryWithBackoff(
        () => ai.models.generateContent({
          model: MODEL_CONFIG.FOLLOW_UP,
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                followUpQuestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["followUpQuestions"]
            }
          }
        }),
        { label: 'generateFollowUps — follow-ups' }
      )
    );
    return this.extractJson(response.text || "");
  }

  /**
   * PASS 2: Deep Logic Audit using Pro.
   * Uses a single request with ThinkingLevel.LOW for better reliability.
   * Includes a Flash fallback if Pro fails or times out.
   */
  async analyzeFullSession(
    type: InterviewType, 
    question: string, 
    initialTranscript: string, 
    followUpQuestions: string[], 
    followUpTranscript: string
  ): Promise<InterviewResult> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
  // Run extraction passes in parallel for both transcripts
  const initialExtraction = await extractTranscriptSignals(
    ai, initialTranscript, 'initialTranscript'
  );
  const defenseExtraction = await extractTranscriptSignals(
    ai, followUpTranscript, 'followUpTranscript'
  );

  const initialWordCount = initialTranscript.trim()
    .split(/\s+/).length;
  const defenseWordCount = followUpTranscript.trim()
    .split(/\s+/).length;

  // Build the evidence block for the analysis prompt.
  // If extraction succeeded, the full transcript is still passed 
  // for annotation generation — but the extracted evidence is 
  // prepended to guide the model's attention to specific moments.
  // If extraction failed, the model receives the full transcript 
  // with no extraction scaffolding.

  const initialEvidenceBlock = initialExtraction 
    ? `EXTRACTED EVIDENCE — INITIAL RESPONSE (${initialWordCount} words):
The following signals were pre-extracted from the full transcript 
to guide your analysis. Use these as your primary scoring evidence. 
The full transcript follows for annotation generation.

STRENGTHS IDENTIFIED:
${JSON.stringify(initialExtraction.strengths, null, 2)}

WEAKNESSES IDENTIFIED:
${JSON.stringify(initialExtraction.weaknesses, null, 2)}

FRAMEWORKS USED:
${JSON.stringify(initialExtraction.frameworks, null, 2)}

METRICS REFERENCED:
${JSON.stringify(initialExtraction.metrics, null, 2)}

KEY CLAIMS MADE:
${JSON.stringify(initialExtraction.claims, null, 2)}

STRUCTURE SIGNALS:
${JSON.stringify(initialExtraction.structureSignals, null, 2)}

HEDGING LANGUAGE FOUND:
${JSON.stringify(initialExtraction.hedgingInstances, null, 2)}

STAFF-LEVEL ELEMENTS MISSING ENTIRELY:
${JSON.stringify(initialExtraction.missingElements, null, 2)}

FULL TRANSCRIPT (use for annotation text anchoring only):
${initialTranscript}`
    : `FULL TRANSCRIPT — INITIAL RESPONSE (${initialWordCount} words):
${initialTranscript}`;

  const defenseEvidenceBlock = defenseExtraction
    ? `EXTRACTED EVIDENCE — FOLLOW-UP DEFENSE (${defenseWordCount} words):
${JSON.stringify(defenseExtraction, null, 2)}

FULL TRANSCRIPT (use for annotation text anchoring only):
${followUpTranscript}`
    : `FULL TRANSCRIPT — FOLLOW-UP DEFENSE (${defenseWordCount} words):
${followUpTranscript}`;

    const rubricPromptText = Object.entries(RUBRIC_DEFINITIONS)
      .filter(([key]) => {
        const psKeys = ["Goal Definition", "User Problem Prioritization", "Solution Creativity & Design", "Execution & Sequencing (MVP)", "Strategic Moat", "Second-Order Effects"];
        return type === InterviewType.PRODUCT_SENSE 
          ? psKeys.includes(key) 
          : !psKeys.includes(key);
      })
      .map(([name, def], i) => 
        `${i + 1}. ${name}\n${def.promptDescription}`
      )
      .join('\n');

    const goldenPathTemplate = type === InterviewType.PRODUCT_SENSE 
      ? GOLDEN_PATH_PRODUCT_SENSE 
      : GOLDEN_PATH_ANALYTICAL;
    const goldenPathJson = JSON.stringify(goldenPathTemplate, null, 2);

    const prompt = `
      ACT AS A STAFF PM BAR-RAISER.
      Align with Lenny's Newsletter standards.

      Question: ${question}
      Response: ${initialEvidenceBlock}
      Follow-up Qs: ${followUpQuestions.join(', ')}
      Follow-up Defense: ${defenseEvidenceBlock}
      
      AUDIT FOCUS: ${type === InterviewType.PRODUCT_SENSE ? 'PRODUCT SENSE' : 'ANALYTICAL THINKING'}
      ${rubricPromptText}

      GOLDEN PATH REFERENCE (DO NOT MODIFY THIS):
      The following is the fixed canonical Staff-level path for this interview type. Use it exactly as provided for the goldenPath field in your response. Do not invent new steps or reorder them.
      
      ${goldenPathJson}

      LOGIC MAPPING INSTRUCTIONS:
      - userLogicPath: Break down the user's response into a sequence of logical steps. For each step, determine if it aligns with the Staff Golden Path (isAligned). If it does NOT align, provide a specific 'staffPivot' explaining the tactical correction for that specific line.
      - goldenPath: Return the GOLDEN PATH REFERENCE provided above exactly as-is. Do not generate a new path. Copy it verbatim.
      - scriptExample: For each step in the goldenPath, generate a 3-5 sentence script showing EXACTLY what a Staff PM would say at that specific moment in the interview.
        - Use the exact question context (company, product, scenario)
        - Sound like natural spoken interview language, not written prose
        - End with a transition phrase that sets up the next step
        - Be specific enough that the user could repeat it in a real interview with minimal adaptation

      COMMUNICATION ANALYSIS INSTRUCTIONS:
      Evaluate the written transcript only. Do not infer vocal qualities.
      Score each dimension 0-100:

      - clarityScore: Is the response easy to follow? Does it avoid jargon without explanation? Are transitions explicit?
      - structureScore: Does the candidate use a recognizable PM framework? Do they signal structure explicitly (e.g. "First... Second... Finally...")? Staff standard: uses executive summary + Rule of Three.
      - specificityScore: Are claims backed by specific data, examples, percentages, or named frameworks? Penalize vague statements like "increase engagement" with no mechanism.
      - executiveFramingScore: Does the response lead with the key insight or recommendation before the supporting detail? Staff standard: bottom-line-up-front structure.
      - hedgingLanguageFound: List every instance of weak hedging language found verbatim (e.g. "I think", "maybe", "sort of", "kind of", "I guess", "probably"). Return as array of strings.
      - overallAssessment: "Strong", "Average", or "Needs Work"
      - summary: 2-3 sentences describing the most important communication pattern to fix, with a specific example from the transcript.

      ANNOTATION INSTRUCTIONS:
      - annotatedVision covers the initial response transcript
      - annotatedDefense covers the follow-up defense transcript
      - Split each transcript into chunks of 1-3 sentences per annotation
      - Each annotation must have a type: "strength", "weakness", "qualifier", or "neutral"
      - Neutral annotations require no feedback field
      - For strength, weakness, and qualifier annotations, the feedback field MUST follow this exact format with no deviation:

        [One sentence critique of why this phrase is strong or weak]
        REWRITE: [A rewritten version of the candidate's exact words at Staff level — keep it to 1-2 sentences]
        ACTION: [One specific, concrete thing the candidate should practice or learn to improve this skill]

      - Also populate the whyItMatters field for all non-neutral annotations with 1-2 sentences explaining the strategic significance of this gap or strength in a real PM interview
      - Aim for roughly 30% strength, 40% weakness/qualifier, 30% neutral across each transcript — do not annotate every phrase as a weakness

      ANNOTATION GROUNDING INSTRUCTIONS:
      The EXTRACTED EVIDENCE blocks above contain pre-identified 
      verbatim quotes from the transcript already categorized as 
      strengths or weaknesses. When generating annotatedVision and 
      annotatedDefense arrays:

      1. Prioritize quotes from the extraction blocks as annotation 
         anchors — these are the highest-signal moments
      2. The text field of each annotation must be verbatim text 
         from the original transcript — do not paraphrase or modify
      3. Use the severity field from the weaknesses extraction to 
         inform annotation type: critical → weakness, 
         moderate → weakness or qualifier, minor → qualifier
      4. Every item in missingElements must generate at least one 
         weakness annotation that references the absence explicitly
      5. Every item in the strengths extraction should generate a 
         strength annotation
      6. Fill gaps between high-signal annotations with neutral 
         annotations to ensure full transcript coverage

      SCORING INSTRUCTIONS:

      All scores must use the full 0-100 range. Use these anchors:

      SCORE 90-100 (Exceptional / Staff+):
      The response would impress even a skeptical bar-raiser. The candidate demonstrated the behavior without prompting, integrated company-specific context, used precise quantitative reasoning, and pre-empted counterarguments. Fewer than 1 in 10 candidates reach this tier.

      SCORE 75-89 (Strong / Staff):
      The candidate demonstrated the required behavior clearly. There may be minor gaps in depth or precision but the core logic is sound and the approach is replicable. This represents a hire signal at most top-tier PM teams.

      SCORE 60-74 (Adequate / Senior PM):
      The candidate touched on the right concept but lacked depth, specificity, or proactive framing. A senior PM at a mid-sized company would produce this response. It is not a bar-raise signal.

      SCORE 40-59 (Developing / Associate PM):
      The candidate showed awareness of the concept but could not execute it under pressure. The response has significant gaps that would concern an interviewer. Coaching required.

      SCORE 0-39 (Needs Work):
      The candidate did not demonstrate this skill. The response either missed the concept entirely or actively contradicted best practice.

      CALIBRATION RULES:
      - Do not give any score above 85 unless the response contains a specific, quantified claim or a company-specific insight
      - Do not give any score above 75 unless the candidate explicitly structured their answer using a recognizable framework
      - Do not give the same score to more than 2 rubric categories in one session — differentiate based on relative performance
      - The overallScore will be calculated mathematically from your rubric scores — calibrate each category independently
      - A response can score 90 in one category and 45 in another — uneven profiles are more accurate than uniformly average scores
    `;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        userLogicPath: { 
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              step: { type: Type.STRING },
              isAligned: { type: Type.BOOLEAN },
              staffPivot: { type: Type.STRING }
            },
            required: ["step", "isAligned"]
          }
        },
        defensivePivotAnalysis: { type: Type.STRING },
        rubricScores: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { 
                type: Type.STRING,
                enum: type === InterviewType.PRODUCT_SENSE 
                  ? ["Goal Definition", "User Problem Prioritization", "Solution Creativity & Design", "Execution & Sequencing (MVP)", "Strategic Moat", "Second-Order Effects"]
                  : ["Root Cause Analysis (Debugging)", "Hypothesis Generation", "Metric Funnel", "Unintended Consequences", "Incremental Lift", "Trade-off Decision Making"]
              },
              score: { type: Type.NUMBER },
              reasoning: { type: Type.STRING }
            },
            required: ["category", "score", "reasoning"]
          }
        },
        improvementItems: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              action: { type: Type.STRING },
              howTo: { type: Type.STRING },
              whyItMatters: { type: Type.STRING },
              effort: { type: Type.STRING },
              impact: { type: Type.STRING }
            },
            required: ["category", "action", "howTo", "whyItMatters", "effort", "impact"]
          }
        },
        communicationAnalysis: {
          type: Type.OBJECT,
          properties: {
            specificityScore: { type: Type.NUMBER },
            executiveFramingScore: { type: Type.NUMBER },
            hedgingLanguageFound: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            clarityScore: { type: Type.NUMBER },
            structureScore: { type: Type.NUMBER },
            overallAssessment: { type: Type.STRING },
            summary: { type: Type.STRING }
          },
          required: ["specificityScore", "executiveFramingScore", "hedgingLanguageFound", "clarityScore", "structureScore", "overallAssessment", "summary"]
        },
        annotatedVision: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["text", "type", "feedback"]
          }
        },
        annotatedDefense: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              type: { type: Type.STRING },
              feedback: { type: Type.STRING }
            },
            required: ["text", "type", "feedback"]
          }
        },
        goldenPath: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              why: { type: Type.STRING },
              strategicTradeOffs: { type: Type.STRING },
              scriptExample: { type: Type.STRING }
            },
            required: ["title", "content", "why", "strategicTradeOffs", "scriptExample"]
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
        },
        benchmarkResponse: { type: Type.STRING }
      },
      required: [
        "userLogicPath", "defensivePivotAnalysis", "rubricScores", 
        "improvementItems", "communicationAnalysis", "annotatedVision", 
        "annotatedDefense", "goldenPath", "recommendedResources", "benchmarkResponse"
      ]
    };

    const formatResult = (data: any): InterviewResult => {
      const rubricScores = data.rubricScores || [];
      const comms = data.communicationAnalysis || { clarityScore: 0, structureScore: 0, specificityScore: 0, executiveFramingScore: 0 };
      
      // Calculate scores mathematically
      const avgRubric = rubricScores.length > 0 
        ? rubricScores.reduce((sum: number, r: any) => sum + r.score, 0) / rubricScores.length 
        : 0;
      
      const avgComms = (comms.clarityScore + (comms.structureScore || 0) + (comms.specificityScore || 0) + (comms.executiveFramingScore || 0)) / 4;
      
      // Overall score: 80% rubric, 20% communication
      const overallScore = Math.round((avgRubric * 0.8) + (avgComms * 0.2));
      
      // Vision score: average of all but the last rubric category
      const visionRubrics = rubricScores.slice(0, Math.max(1, rubricScores.length - 1));
      const visionScore = visionRubrics.length > 0
        ? Math.round(visionRubrics.reduce((sum: number, r: any) => sum + r.score, 0) / visionRubrics.length)
        : 0;
        
      // Defense score: the last rubric category (which corresponds to the follow-up defense)
      const defenseScore = rubricScores.length > 0 ? rubricScores[rubricScores.length - 1].score : 0;
      const defensivePivotScore = defenseScore; // Use the same score for the pivot

      return {
        ...data,
        overallScore,
        visionScore,
        defenseScore,
        defensivePivotScore,
        transcription: initialTranscript,
        followUpQuestions,
        followUpTranscription: followUpTranscript,
        strengths: rubricScores.filter((s: any) => s.score >= 80).map((s: any) => s.category),
        weaknesses: rubricScores.filter((s: any) => s.score < 60).map((s: any) => s.category)
      };
    };

  const extractionSummarySize = 
    (initialExtraction ? JSON.stringify(initialExtraction) : '')
      .split(/\s+/).length +
    (defenseExtraction ? JSON.stringify(defenseExtraction) : '')
      .split(/\s+/).length;
      
  console.log(
    `[geminiService] analyzeFullSession — ` +
    `Initial transcript: ${initialWordCount} words, ` +
    `Defense transcript: ${defenseWordCount} words, ` +
    `Extraction summary: ~${extractionSummarySize} words. ` +
    `Full transcripts passed for annotation anchoring.`
  );

  try {
    // Attempt Pro Audit with lower thinking level for stability
    const response = await retryWithBackoff(
      () => ai.models.generateContent({
        model: MODEL_CONFIG.ANALYSIS_PRIMARY,
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: responseSchema
        }
      }),
      { label: 'analyzeFullSession — primary analysis', baseDelayMs: 5000 }
    );
    const data = this.extractJson(response.text || "");
    if (data) return formatResult(data);
  } catch (e) {
    console.warn("[GeminiService] Pro Audit failed or timed out, falling back to Flash:", e);
  }

  // Fallback to Flash for guaranteed completion
  const response = await flashQueue.add(() =>
    retryWithBackoff(
      () => ai.models.generateContent({
        model: MODEL_CONFIG.ANALYSIS_FALLBACK,
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: responseSchema
        }
      }),
      { label: 'analyzeFullSession — fallback analysis' }
    )
  );
  
  const data = this.extractJson(response.text || "");
  if (!data) {
    console.error("[GeminiService] Flash fallback also failed to return valid JSON.");
    throw new Error("Critical JSON failure: The audit response was incomplete or corrupted.");
  }
  
  return formatResult(data);
}

  async verifyDeltaPractice(delta: ImprovementItem, audioBase64: string, mimeType: string): Promise<{ success: boolean; feedback: string }> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const prompt = `
  You are a Staff PM coach listening to a practice recording.
  
  The candidate is working on this specific improvement:
  Target Skill: "${delta.action}"
  Category: "${delta.category}"
  
  What success looks like:
  ${delta.howTo}
  
  Why this skill matters:
  ${delta.whyItMatters}
  
  Listen to the recording and evaluate against the success 
  criteria above specifically. Then return:
  
  success: true ONLY if the candidate clearly demonstrated 
  the specific behavior described in "What success looks like". 
  A generic good answer is not sufficient — the specific 
  framing or structure must be present.
  
  feedback: Write 2-3 sentences of coaching. Structure it as:
  - What they did well in this attempt (be specific, quote 
    their words if possible)
  - One concrete thing to adjust in the next attempt
  - End with an encouraging but honest closing sentence
  
  Do not give generic PM interview feedback. Every sentence 
  must relate directly to the target skill above.
`;

    try {
      const response = await flashQueue.add(() =>
        retryWithBackoff(
          () => ai.models.generateContent({
            model: MODEL_CONFIG.DELTA_VERIFY,
            contents: { parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: prompt }] },
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  success: { type: Type.BOOLEAN },
                  feedback: { type: Type.STRING }
                },
                required: ["success", "feedback"]
              }
            }
          }),
          { label: 'verifyDeltaPractice — verification' }
        )
      );
      return this.extractJson(response.text || "");
    } catch (e) {
      console.error("[GeminiService] Delta practice verification failed:", e);
      return { success: false, feedback: "Verification timed out." };
    }
  }
  async generateGoldenPathScripts(
    type: InterviewType,
    question: string,
    goldenPath: any[]
  ): Promise<string[]> {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    
    const prompt = `
      You are a Staff PM interview coach.
      
      Context:
      Interview Type: ${type}
      Question: "${question}"
      
      I have a Golden Path (ideal structure) for this answer.
      For each step in the path, write a 3-5 sentence "Script Example" showing EXACTLY what a Staff PM would say at that specific moment.
      
      Golden Path Steps:
      ${goldenPath.map((step, i) => `${i+1}. ${step.title}: ${step.content}`).join('\n')}
      
      Requirements:
      - Use the exact question context (company, product, scenario)
      - Sound like natural spoken interview language, not written prose
      - End with a transition phrase that sets up the next step
      - Be specific enough that the user could repeat it in a real interview with minimal adaptation
      
      Return a JSON object with a single field "scripts" which is an array of strings.
      The array must have exactly ${goldenPath.length} strings, corresponding to the steps in order.
    `;

    try {
      const response = await flashQueue.add(() =>
        retryWithBackoff(
          () => ai.models.generateContent({
            model: MODEL_CONFIG.ANALYSIS_FALLBACK, // Use Flash for speed/cost
            contents: prompt,
            config: { 
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  scripts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["scripts"]
              }
            }
          }),
          { label: 'generateGoldenPathScripts' }
        )
      );
      
      const data = this.extractJson(response.text || "");
      return data?.scripts || [];
    } catch (e) {
      console.error("[GeminiService] Failed to generate scripts:", e);
      return [];
    }
  }
}

export const geminiService = new GeminiService();