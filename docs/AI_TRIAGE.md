# UbuntuScamBank — AI Triage Pipeline

> **Living document** — this reflects the current best understanding of the project as of the initial brainstorming phase. Decisions, structures, and specs here are subject to change as development progresses. Update this file when anything meaningfully changes.
>
> ---

## Powered by Claude API (claude-sonnet-4-6)

---

## Overview

Every submission passes through a 5-step automated pipeline before it reaches the database or public feed:

```sh
User submits content
       ↓
1. PII Scrub       — strip victim's personal data
       ↓
2. Classification  — type, severity, confidence, summary
       ↓
3. IOC Extraction  — domains, IPs, emails, phones, URLs
       ↓
4. Novelty Check   — is this a new campaign or known variant?
       ↓
5. Deduplication   — hash check against existing reports
       ↓
Write to database + award points
```

---

## Pipeline Implementation (TypeScript)

```typescript
// src/lib/ai/triage.ts
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TriageResult {
  type:
    | 'phishing_email'
    | 'smishing'
    | 'vishing'
    | 'investment_fraud'
    | 'romance_scam'
    | 'business_email_compromise'
    | 'tech_support'
    | 'crypto_fraud'
    | 'other';
  severity: number;
  severity_reason: string;
  confidence: number;
  summary: string;
  ai_tags: string[];
  indicators: Array<{ type: string; value: string }>;
  is_novel: boolean;
  novel_reason: string;
  pii_stripped: boolean;
  pii_found: string[];
}

const FALLBACK_RESULT = Object.freeze({
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
} as TriageResult);

export async function triageSubmission(
  rawContent: string,
): Promise<TriageResult> {
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Analyse this submission:\n\n${rawContent}`,
        },
      ],
    });

    const rawJson =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const result = JSON.parse(rawJson) as TriageResult;

    // Enforce required fields with safe defaults
    result.is_novel = result.is_novel ?? false;
    result.novel_reason = result.novel_reason ?? '';
    result.pii_stripped = result.pii_stripped ?? false;
    result.pii_found = result.pii_found ?? [];
    result.confidence =
      Math.round(Math.max(0, Math.min(1, result.confidence ?? 0.5)) * 1000) /
      1000;
    result.severity = Math.max(1, Math.min(5, result.severity ?? 1));

    return result;
  } catch (error) {
    console.error('Triage failed:', error);
    return { ...FALLBACK_RESULT };
  }
}

export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

---

## Triage Output → Database Mapping

| Triage field   | Database column                          |
| -------------- | ---------------------------------------- |
| `type`         | `reports.type` and `reports.ai_category` |
| `severity`     | `reports.severity`                       |
| `confidence`   | `reports.ai_confidence`                  |
| `summary`      | `reports.summary`                        |
| `ai_tags`      | `reports.ai_tags` (text array)           |
| `is_novel`     | `reports.is_novel`                       |
| `indicators[]` | Insert rows into `indicators` table      |
| `pii_stripped` | Log only — not stored on report          |

---

## Deduplication Logic

Before inserting a new report, hash the core content:

```typescript
import { hashContent } from '@/lib/ai/triage';

const contentHash = await hashContent(coreContent);
const existingReport = await db
  .from('reports')
  .select('id, campaign_id')
  .eq('content_hash', contentHash)
  .single();
```

Query `reports` for a matching `content_hash`. If found:

- Link submission to the existing `campaign_id`
- Set `isDuplicate = true` in `calculatePoints()`
- Still insert a `submissions` row and award reduced points (5pts)
- Increment `campaigns.report_count`

**Important Note on Dedup Hash:** The hash is computed from `coreContent` only — the free-text context note is **excluded**. This means two users submitting the same scam with different notes (context) still trigger dedup correctly, because the hash focuses on the core scam content.

---

## Triage Quality Notes

### hashContent Implementation

Uses Web Crypto API (not Node crypto) for Workers runtime compatibility:

```typescript
export async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
```

Normalisation step (`.trim().toLowerCase()`) ensures same content always hashes the same way regardless of whitespace or case.

### Error Handling

The triage pipeline should never block a submission from being stored. If the Claude API call fails or returns unparseable JSON:

```typescript
try {
  triage_result = await triageSubmission(rawContent);
} catch (error) {
  console.error('Triage failed:', error);
  // Fall back to pending status, manual moderation
  triage_result = { ...FALLBACK_RESULT };
  // Set flag for manual review
  triage_failed = true;
}
```

Failed triage submissions are stored with `triage_failed = true` and `status = 'under_review'` for manual moderation. The report is still recorded and the user still receives points.

---

### Markdown fence stripping

Claude sometimes wraps JSON output in markdown fences despite prompt instructions. The parser strips ` ```json ` and ` ``` ` fences before JSON.parse() as a defensive measure.

---

## Cost Estimate

At approximately 500 tokens per submission (input + output), using claude-sonnet-4-6:

- 1,000 submissions/month ≈ negligible cost
- 100,000 submissions/month ≈ manageable at scale

Well within NGO/grant budget at any realistic early-stage volume.
