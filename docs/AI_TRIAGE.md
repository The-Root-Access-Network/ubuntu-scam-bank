# UbuntuScamBank — AI Triage Pipeline

> **Living document** — updated to reflect current implementation as of feat/image-triage.
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

For image submissions (JPEG, PNG, WebP), Claude reads the screenshot directly via the vision API rather than relying on extracted text. See **[Image Triage](#image-triage)** below.

---

## Triage Functions

Two exported functions in `src/lib/ai/triage.ts`. Both share `TRIAGE_SYSTEM_PROMPT`, `parseAndValidate()`, and `FALLBACK_RESULT`.

### `triageSubmission(rawContent: string)`

Text-only triage. Used for EML, PDF, TXT files and plain pasted text.

### `triageSubmissionWithImage(rawContent, imageBase64, mimeType)`

Vision triage. Passes the image as a base64 content block alongside any text context the user provided. Used for JPEG, PNG, and WebP uploads.

Falls back to `triageSubmission` if:

- Image download from Supabase Storage fails
- File type is not JPEG, PNG, or WebP
- No file was uploaded

### `hashContent(content: string)`

SHA-256 of normalised content for deduplication. Uses Web Crypto API (`crypto.subtle`) — compatible with both Vercel (Node.js) and Cloudflare Workers runtimes.

---

## Image Triage

When a JPEG, PNG, or WebP file is uploaded, the submit route (`/api/submit`):

1. Uploads the file to Supabase Storage (Step 5, unchanged)
2. Downloads the bytes immediately after upload (Step 6a)
3. Encodes to base64 and passes to `triageSubmissionWithImage` (Step 8)

Claude can extract IOCs directly from image content — URLs, phone numbers, sender names, domain names, QR codes, and any text visible in a screenshot of a scam message.

The submit route falls back to text-only triage non-fatally if the image download fails. The submission is always stored regardless.

```typescript
const IMAGE_TRIAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
```

**Note on `Buffer`:** Used in the submit route to convert `ArrayBuffer` → base64 string. Available as a global in both Node.js (Vercel) and Cloudflare Workers (via `nodejs_compat` flag). No import needed.

---

## Shared Output Parser

`parseAndValidate(raw: string): TriageResult` — used by both triage functions:

- Strips markdown code fences Claude sometimes adds despite prompt instructions
- Validates every field against known enum values (`ScamType`, `IndicatorType`)
- Applies safe numeric clamping: severity 1–5, confidence 0.0–1.0
- Filters out indicators with empty values or unknown types
- Returns `FALLBACK_RESULT` (with `triage_failed: true`) on any parse failure

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

The hash is computed from `coreContent` only — the context note is excluded. This ensures two users submitting the same scam with different notes still trigger deduplication correctly.

For file-only submissions with no text, `hashSource` falls back to `file:{path}` (unique per submission since the path encodes `userId/reportId.ext`).

```typescript
const hashSource = coreContent || `file:${fileResult?.path ?? reportId}`;
const contentHash = await hashContent(hashSource);
```

---

## Error Handling

Triage never throws and never blocks a submission from being stored.

- Claude API failure → `FALLBACK_RESULT` (`triage_failed: true`)
- Unparseable JSON → `FALLBACK_RESULT` (`triage_failed: true`)
- Image download failure → falls back to text-only triage, logs error
- Reports with `triage_failed: true` → stored with `status = 'under_review'` for manual moderation
- Points are still awarded regardless of triage outcome

---

## Cost Estimate

Image triage uses more tokens than text-only (vision API input counts image tokens). Rough estimates using claude-sonnet-4-6:

- Text-only submission: ~500 tokens in + out ≈ negligible
- Image submission (1024×768 JPEG): ~1,500–2,500 tokens in + out ≈ still negligible at MVP scale

Well within NGO/grant budget at realistic early-stage volumes.
