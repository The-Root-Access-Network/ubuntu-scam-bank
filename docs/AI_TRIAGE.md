# UbuntuScamBank — AI Triage Pipeline

> **Living document** — this reflects the current best understanding of the project as of the initial brainstorming phase. Decisions, structures, and specs here are subject to change as development progresses. Update this file when anything meaningfully changes.
>
> ---

## Powered by Claude API (claude-sonnet-4-20250514)

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

## Pipeline Implementation (Python)

```python
# scamvault_triage.py
import anthropic, json

client = anthropic.Anthropic()

SYSTEM_PROMPT = """
You are ScamVault's threat intelligence triage engine for the Ubuntu Bridge
Initiative. Your job is to analyse submitted scam content and return a
structured JSON object. You must be accurate, consistent, and privacy-safe.

PRIVACY RULE (non-negotiable):
Before any analysis, identify and strip all information that could identify
the victim (the person who submitted this report). This includes:
- Their name, email address, phone number
- Their IP address or device identifiers
- Any reply-to or from fields that belong to the RECIPIENT
- Personal account numbers or reference numbers unique to the victim

You are keeping attacker/scammer information (their domains, their phone
numbers, their sending addresses) — that is threat intelligence.

OUTPUT FORMAT:
Return ONLY valid JSON. No preamble, no explanation, no markdown.

{
  "type": "<phishing_email|smishing|vishing|investment_fraud|romance_scam|
            business_email_compromise|tech_support|crypto_fraud|other>",
  "severity": <integer 1-5>,
  "severity_reason": "<one sentence explaining severity score>",
  "confidence": <float 0.0-1.0>,
  "summary": "<2-3 sentence plain-English summary for a non-technical reader>",
  "ai_tags": ["<tag1>", "<tag2>"],
  "indicators": [
    { "type": "<domain|ip_address|email_address|phone_number|url|sender_name|file_hash>",
      "value": "<the actual value>" }
  ],
  "is_novel": <true|false>,
  "novel_reason": "<if is_novel=true, explain what makes this appear new>",
  "pii_stripped": <true|false>,
  "pii_found": ["<list of PII types found and removed>"]
}

SEVERITY SCALE:
1 = Low (generic mass spam, no convincing elements)
2 = Mild (some personalisation, limited financial risk)
3 = Moderate (convincing, targets credentials or small amounts)
4 = High (highly convincing, targets significant financial amounts or sensitive credentials)
5 = Critical (novel campaign, zero-day lure, targets critical infrastructure)

TAG VOCABULARY:
urgent_action | impersonation | brand_spoofing | gov_impersonation |
bank_impersonation | credential_harvest | financial_fraud | data_exfiltration |
lookalike_domain | social_engineering | mobile_money | crypto | gift_cards |
wire_transfer | invoice_fraud | fake_delivery | lottery | job_scam |
sextortion | malware_link | qr_code | ai_generated_text

NOVELTY GUIDANCE:
Mark is_novel=true if the content shows a lure or pretext not commonly seen,
a new technical mechanism, or a new target demographic for a known scam type.
Most submissions will be known variants — mark false by default.
"""

def triage_submission(raw_content: str) -> dict:
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Analyse this submission:

{raw_content}"
            }
        ]
    )

    raw_json = response.content[0].text.strip()
    result = json.loads(raw_json)

    # Enforce required fields with safe defaults
    result.setdefault("is_novel", False)
    result.setdefault("novel_reason", "")
    result.setdefault("pii_stripped", False)
    result.setdefault("pii_found", [])
    result["confidence"] = round(float(result.get("confidence", 0.5)), 3)
    result["severity"] = max(1, min(5, int(result.get("severity", 1))))

    return result


def calculate_points(triage: dict, is_duplicate: bool) -> tuple[int, str]:
    base = 10
    bonus = 0
    reasons = []

    if triage.get("severity", 1) >= 4:
        bonus += 10
        reasons.append("high severity")

    if triage.get("is_novel"):
        bonus += 25
        reasons.append("novel campaign")

    if is_duplicate:
        base = 5
        reasons.append("duplicate — confirms campaign volume")

    total = base + bonus
    reason = f"base submission ({base}pt)"
    if reasons:
        reason += " + " + ", ".join(reasons) + f" ({bonus}pt bonus)"

    return total, reason
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

```python
import hashlib

def content_hash(raw_content: str) -> str:
    normalised = raw_content.strip().lower()
    return hashlib.sha256(normalised.encode()).hexdigest()
```

Query `reports` for a matching `content_hash`. If found:

- Link submission to the existing `campaign_id`
- Set `is_duplicate = True` in `calculate_points()`
- Still insert a `submissions` row and award reduced points (5pts)
- Increment `campaigns.report_count`

---

## Error Handling

The triage pipeline should never block a submission from being stored. If the Claude API call fails or returns unparseable JSON:

```python
try:
    triage_result = triage_submission(raw_content)
except Exception as e:
    # Fall back to pending status, manual moderation
    triage_result = {
        "type": "other",
        "severity": 1,
        "confidence": 0.0,
        "summary": "",
        "ai_tags": [],
        "indicators": [],
        "is_novel": False,
        "pii_stripped": False,
        "pii_found": []
    }
    # Log error for review
    log_triage_failure(report_id, str(e))
```

Failed triage submissions are stored with `status = 'under_review'` for manual moderation.

---

## Cost Estimate

At approximately 500 tokens per submission (input + output), using claude-sonnet:

- 1,000 submissions/month ≈ negligible cost
- 100,000 submissions/month ≈ manageable at scale

Well within NGO/grant budget at any realistic early-stage volume.
