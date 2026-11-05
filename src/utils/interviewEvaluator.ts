// src/utils/interviewEvaluator.ts
// Standardized 100-Point Interview Evaluation Engine for ApplyVise AI
// Reusable across Node.js/Express and Cloudflare Workers runtimes

import { CandidateFact } from '../types/index.ts';

export interface EvaluationDimension {
  score: number;
  maxScore: number;
  explanation: string;
}

export interface StructureDimension extends EvaluationDimension {
  maxScore: 25;
  missingStarElements: string[];
}

export interface EvidenceDimension extends EvaluationDimension {
  maxScore: 30;
  verifiedClaims: string[];
  unsupportedClaims: string[];
}

export interface InterviewEvaluationOutput {
  overallScore: number;
  relevance: EvaluationDimension & { maxScore: 25 };
  structure: StructureDimension;
  clarity: EvaluationDimension & { maxScore: 20 };
  evidence: EvidenceDimension;
  strengths: string[];
  improvementOpportunities: string[];
  evaluationConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evaluationStatus: 'COMPLETED' | 'UNAVAILABLE' | 'FAILED';
  timestamp: string;
  modelUsed: string;
  error?: string;
}

export interface EvaluateAnswerParams {
  questionId: string;
  question: string;
  answer: string;
  roleTitle: string;
  companyName?: string;
  category?: string;
  context?: string;
  expectedPoints?: string[];
  verifiedFacts?: CandidateFact[];
  apiKey?: string;
}

/**
 * Builds the rigorous evaluation prompt instructing Gemini to evaluate strictly on factual evidence.
 */
export function buildInterviewEvaluationPrompt(params: {
  question: string;
  answer: string;
  roleTitle: string;
  companyName?: string;
  category?: string;
  context?: string;
  expectedPoints?: string[];
  verifiedFacts?: CandidateFact[];
}): string {
  const verifiedSkills = (params.verifiedFacts || [])
    .filter(f => (f.category === 'SKILL' || f.category === 'skill') && (f.verificationStatus === 'USER_CONFIRMED' || f.verificationStatus === 'EXTRACTED'))
    .map(f => f.value);

  const verifiedExperiences = (params.verifiedFacts || [])
    .filter(f => f.category === 'EMPLOYMENT' || f.category === 'employment')
    .map(f => `${f.field}: ${f.value}`);

  const factsContext = verifiedSkills.length > 0 || verifiedExperiences.length > 0
    ? `CANDIDATE GROUND-TRUTH VERIFIED FACTS IN REGISTRY:\n- Skills: ${verifiedSkills.join(', ') || 'None registered'}\n- Verified Roles: ${verifiedExperiences.join('; ') || 'None registered'}`
    : 'No pre-verified candidate facts in registry. Penalize Evidence score if candidate claims unverifiable metrics or past achievements without grounding.';

  return `You are a Principal Executive Hiring Director and Expert Interview Evaluator at ApplyVise AI.
Evaluate the candidate's interview response against the exact question, target role, and candidate ground-truth facts.

TARGET ROLE: ${params.roleTitle}
TARGET COMPANY: ${params.companyName || 'Target Employer'}
QUESTION CATEGORY: ${params.category || 'Behavioral'}
CONTEXT: ${params.context || 'General Interview'}

INTERVIEW QUESTION:
"${params.question}"

EXPECTED EVIDENCE POINTS:
${(params.expectedPoints || []).map((p, i) => `${i + 1}. ${p}`).join('\n') || 'Clear explanation, structured STAR method, tangible actions, verified business outcome.'}

${factsContext}

CANDIDATE SUBMITTED ANSWER:
"${params.answer}"

EVALUATION RUBRIC (100 TOTAL POINTS):
1. RELEVANCE TO QUESTION (Max 25 points):
   - Does the answer directly address the question asked?
   - Is it appropriate for the seniority level of ${params.roleTitle}?
   - Does it demonstrate relevant professional judgment?

2. STRUCTURE & STAR FRAMEWORK (Max 25 points):
   - Situation: Sets business context and quantitative stakes.
   - Task: Identifies personal responsibility and challenges.
   - Action: Explains specific decisions, tools, and technical execution.
   - Result: Quantifies business outcomes, lessons, and impacts.
   - List any missing STAR components in missingStarElements.

3. CLARITY & COMMUNICATION (Max 20 points):
   - Is the response logically organized, concise, and persuasive?
   - Does it avoid filler, hand-waving, and circular explanations?

4. EVIDENCE & FACTUAL SUPPORT (Max 30 points):
   - Are achievements and metrics plausible and grounded in candidate facts?
   - Does the candidate differentiate personal contribution from collective team outcomes?
   - Identify any unsupported or unverifiable claims in unsupportedClaims.
   - DO NOT give full evidence points if the answer claims unverified achievements or invented statistics.

CRITICAL INSTRUCTIONS:
- You must output VALID JSON only. Do not enclose in markdown blocks.
- Output schema:
{
  "relevanceScore": <number 0-25>,
  "relevanceExplanation": "<string>",
  "structureScore": <number 0-25>,
  "structureExplanation": "<string>",
  "missingStarElements": ["<string>"],
  "clarityScore": <number 0-20>,
  "clarityExplanation": "<string>",
  "evidenceScore": <number 0-30>,
  "evidenceExplanation": "<string>",
  "verifiedClaims": ["<string>"],
  "unsupportedClaims": ["<string>"],
  "strengths": ["<string>"],
  "improvementOpportunities": ["<string>"],
  "evaluationConfidence": "HIGH" | "MEDIUM" | "LOW"
}`;
}

/**
 * Validates and normalizes raw JSON response from Gemini into a type-safe InterviewEvaluationOutput.
 */
export function validateInterviewEvaluationOutput(
  rawJson: any,
  modelName: string = 'gemini-2.5-flash'
): InterviewEvaluationOutput {
  const relScore = Math.max(0, Math.min(25, Number(rawJson.relevanceScore) || 0));
  const structScore = Math.max(0, Math.min(25, Number(rawJson.structureScore) || 0));
  const clarityScore = Math.max(0, Math.min(20, Number(rawJson.clarityScore) || 0));
  const evidenceScore = Math.max(0, Math.min(30, Number(rawJson.evidenceScore) || 0));
  const overallScore = relScore + structScore + clarityScore + evidenceScore;

  return {
    overallScore,
    relevance: {
      score: relScore,
      maxScore: 25,
      explanation: String(rawJson.relevanceExplanation || 'Evaluation of question relevance and role judgment.'),
    },
    structure: {
      score: structScore,
      maxScore: 25,
      explanation: String(rawJson.structureExplanation || 'Evaluation of STAR framework adherence.'),
      missingStarElements: Array.isArray(rawJson.missingStarElements)
        ? rawJson.missingStarElements.map(String)
        : [],
    },
    clarity: {
      score: clarityScore,
      maxScore: 20,
      explanation: String(rawJson.clarityExplanation || 'Evaluation of logical organization and articulation.'),
    },
    evidence: {
      score: evidenceScore,
      maxScore: 30,
      explanation: String(rawJson.evidenceExplanation || 'Evaluation of factual grounding and metric plausibility.'),
      verifiedClaims: Array.isArray(rawJson.verifiedClaims)
        ? rawJson.verifiedClaims.map(String)
        : [],
      unsupportedClaims: Array.isArray(rawJson.unsupportedClaims)
        ? rawJson.unsupportedClaims.map(String)
        : [],
    },
    strengths: Array.isArray(rawJson.strengths) && rawJson.strengths.length > 0
      ? rawJson.strengths.map(String)
      : ['Clear communication of professional experience.'],
    improvementOpportunities: Array.isArray(rawJson.improvementOpportunities) && rawJson.improvementOpportunities.length > 0
      ? rawJson.improvementOpportunities.map(String)
      : ['Add more verifiable quantitative baselines to outcome description.'],
    evaluationConfidence: ['HIGH', 'MEDIUM', 'LOW'].includes(rawJson.evaluationConfidence)
      ? rawJson.evaluationConfidence
      : 'HIGH',
    evaluationStatus: 'COMPLETED',
    timestamp: new Date().toISOString(),
    modelUsed: modelName,
  };
}
