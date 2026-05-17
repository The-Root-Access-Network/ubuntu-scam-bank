// src/lib/ai/triage.ts

/**
 * AI triage pipeline for UbuntuScamBank.
 * @param rawContent - The raw text content of the submission to triage.
 * @returns A structured TriageResult with extracted fields and metadata.
 * This module encapsulates all interactions with the Anthropic Claude API, as well as the parsing and validation of its responses. It is designed to be robust against API failures and model hallucinations, returning a safe fallback result when necessary.
 *
 * Workflow:
 * 1. Receives raw submission content from the submit route.
 * 2. Calls the Claude API by /api/submit after the dedup hash check with a system prompt and user message containing the content.
 * 3. Parses the response, applying strict validation and defaults for every field.
 * 4. Returns a typed TriageResult that downstream code can rely on without additional checks.
 *
 * It never writes to the database — that is the submit route's responsibility.
 * 
 * Error handling:
 * - If the API call fails or returns unparseable JSON, triageSubmission returns a fallback result with triage_failed = true and confidence = 0.
 * - The submit route checks triage_failed and sets report status to 'under_review' for manual moderation in these cases.
 *
 * This design ensures that triage issues do not block report submissions, while still surfacing problems for ops visibility and manual review.
 *
 */

import Anthropic from '@anthropic-ai/sdk';
import { TRIAGE_SYSTEM_PROMPT } from './prompts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type ScamType =
  | 'phishing_email'
  | 'smishing'
  | 'vishing'
  | 'investment_fraud'
  | 'romance_scam'
  | 'business_email_compromise'
  | 'tech_support'
  | 'crypto_fraud'
  | 'other';

export type IndicatorType =
  | 'domain'
  | 'ip_address'
  | 'email_address'
  | 'phone_number'
  | 'url'
  | 'sender_name'
  | 'file_hash';

export interface TriageIndicator {
  type: IndicatorType;
  value: string;
}

export interface TriageResult {
  type: ScamType;
  severity: number; // 1–5, clamped and validated
  severity_reason: string;
  confidence: number; // 0.0–1.0, rounded to 3dp
  summary: string;
  ai_tags: string[];
  indicators: TriageIndicator[];
  is_novel: boolean;
  novel_reason: string;
  pii_stripped: boolean;
  pii_found: string[];
  triage_failed: boolean; // true if Claude call failed or JSON unparseable
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_SCAM_TYPES = new Set<ScamType>([
  'phishing_email',
  'smishing',
  'vishing',
  'investment_fraud',
  'romance_scam',
  'business_email_compromise',
  'tech_support',
  'crypto_fraud',
  'other',
]);

const VALID_INDICATOR_TYPES = new Set<IndicatorType>([
  'domain',
  'ip_address',
  'email_address',
  'phone_number',
  'url',
  'sender_name',
  'file_hash',
]);

// Returned whenever Claude is unavailable or returns unparseable output.
// The submit route checks triage_failed and sets report status accordingly.
const FALLBACK_RESULT: TriageResult = {
  type: 'other',
  severity: 1,
  severity_reason: '',
  confidence: 0,
  summary: '',
  ai_tags: [],
  indicators: [],
  is_novel: false,
  novel_reason: '',
  pii_stripped: false,
  pii_found: [],
  triage_failed: true,
};

// ── Client ────────────────────────────────────────────────────────────────────

// Instantiated once per module load — not per request.
// ANTHROPIC_API_KEY is read from the environment at call time.
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ── Content hash ──────────────────────────────────────────────────────────────
// SHA-256 of the normalised content — used for deduplication by the submit route.
// Kept here so the hashing and triage logic travel together.

export async function hashContent(rawContent: string): Promise<string> {
  const normalised = rawContent.trim().toLowerCase();
  const encoded = new TextEncoder().encode(normalised);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

export async function triageSubmission(
  rawContent: string,
): Promise<TriageResult> {
  try {
    const client = getClient();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyse this submission:\n\n${rawContent}`,
        },
      ],
    });

    // Extract the text block — Claude may return multiple content blocks
    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.error('[triage] No text block in Claude response');
      return FALLBACK_RESULT;
    }

    return parseAndValidate(textBlock.text);
  } catch (err) {
    // Log for ops visibility but never propagate — the submit route
    // falls back to under_review status when triage_failed is true
    console.error('[triage] Claude API call failed:', err);
    return FALLBACK_RESULT;
  }
}

// ── Parser and validator ──────────────────────────────────────────────────────
// Applies safe defaults for every field so downstream code never hits
// undefined. Unknown enum values are coerced to safe fallbacks.

function parseAndValidate(raw: string): TriageResult {
  let parsed: Record<string, unknown>;

  try {
    // Strip markdown code fences if Claude wraps output despite instructions
    const cleaned = raw
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.error('[triage] JSON parse failed. Raw response:', raw);
    return FALLBACK_RESULT;
  }

  // ── Type ──────────────────────────────────────────────────────────────────
  const rawType = String(parsed.type ?? 'other');
  const type: ScamType = VALID_SCAM_TYPES.has(rawType as ScamType)
    ? (rawType as ScamType)
    : 'other';

  // ── Severity ──────────────────────────────────────────────────────────────
  const severity = Math.max(
    1,
    Math.min(5, Math.round(Number(parsed.severity ?? 1))),
  );

  // ── Confidence ────────────────────────────────────────────────────────────
  const confidence =
    Math.round(
      Math.max(0, Math.min(1, Number(parsed.confidence ?? 0.5))) * 1000,
    ) / 1000;

  // ── Indicators ────────────────────────────────────────────────────────────
  // Filter out any indicator whose type isn't in the known set,
  // and any whose value is empty — both indicate a model hallucination.
  const rawIndicators = Array.isArray(parsed.indicators)
    ? parsed.indicators
    : [];
  const indicators: TriageIndicator[] = rawIndicators
    .filter(
      (ind): ind is Record<string, unknown> =>
        typeof ind === 'object' && ind !== null,
    )
    .filter((ind) =>
      VALID_INDICATOR_TYPES.has(String(ind.type ?? '') as IndicatorType),
    )
    .filter((ind) => String(ind.value ?? '').trim().length > 0)
    .map((ind) => ({
      type: String(ind.type) as IndicatorType,
      value: String(ind.value).trim(),
    }));

  // ── Tags ──────────────────────────────────────────────────────────────────
  const ai_tags = Array.isArray(parsed.ai_tags)
    ? parsed.ai_tags.map(String).filter((t) => t.length > 0)
    : [];

  // ── PII fields ────────────────────────────────────────────────────────────
  const pii_found = Array.isArray(parsed.pii_found)
    ? parsed.pii_found.map(String)
    : [];

  return {
    type,
    severity,
    severity_reason: String(parsed.severity_reason ?? ''),
    confidence,
    summary: String(parsed.summary ?? ''),
    ai_tags,
    indicators,
    is_novel: Boolean(parsed.is_novel ?? false),
    novel_reason: String(parsed.novel_reason ?? ''),
    pii_stripped: Boolean(parsed.pii_stripped ?? false),
    pii_found,
    triage_failed: false,
  };
}
