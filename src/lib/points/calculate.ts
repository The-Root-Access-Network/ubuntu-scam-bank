// src/lib/points/calculate.ts

/**
 * Calculates points for a given triage input.
 * @param input - The triage input.
 * @param isDuplicate - Whether the submission is a duplicate.
 * @returns The points result.
 *
 * Points calculation logic for UbuntuScamBank.
 * Single source of truth — called by /api/submit after triage completes.
 * All scoring rules live here so they can be updated in one place.
 *
 * Reference: AI_TRIAGE.md → calculate_points()
 * Reference: DATABASE_SCHEMA.md → Points Events Reference
 */

// ── Types ────────────────────────────────────────────────────────────────────

// The subset of triage output this module needs — keeps it decoupled from
// the full TriageResult type so it can be tested independently.
export interface PointsInput {
  severity: number; // 1–5 from triage
  is_novel: boolean; // true if triage flagged a new campaign
  has_metadata: boolean; // true if file upload + context text both present
}

export interface PointsResult {
  total: number; // total points to award
  base: number; // base points before bonuses
  bonus: number; // sum of all bonuses
  breakdown: PointsLineItem[]; // one entry per rule that fired
  ledger_reason: string; // human-readable string for points_ledger.reason
}

export interface PointsLineItem {
  reason: string;
  delta: number;
}

// ── Scoring constants ────────────────────────────────────────────────────────
// Defined as a const object so individual values can be referenced by name
// in tests and in the submit route without magic numbers.

export const POINTS = {
  WELCOME_BONUS: 50, // first report ever — awarded separately at submit time
  BASE_SUBMISSION: 10, // every standard submission
  DUPLICATE: 5, // submission matches existing content hash
  HIGH_SEVERITY: 10, // severity >= 4
  NOVEL_CAMPAIGN: 25, // triage flagged is_novel = true
  FULL_METADATA: 5, // file upload + written context both present
  VOTE_CONFIRM: 15, // community vote confirms the report (Phase 2)
  STREAK_7_DAY: 20, // 7 consecutive days with a submission (Phase 2)
  STREAK_30_DAY: 75, // 30 consecutive days (Phase 2)
  FEATURED_DIGEST: 20, // report selected for weekly digest (Phase 2)
  SPAM_PENALTY: -20, // report flagged as spam or abuse
} as const;

// ── Main calculation ─────────────────────────────────────────────────────────

export function calculatePoints(
  input: PointsInput,
  isDuplicate: boolean,
): PointsResult {
  const breakdown: PointsLineItem[] = [];

  // Base — reduced to 5 for duplicates, which still confirm campaign volume
  const base = isDuplicate ? POINTS.DUPLICATE : POINTS.BASE_SUBMISSION;
  breakdown.push({
    reason: isDuplicate
      ? 'Duplicate submission — confirms campaign volume'
      : 'Base submission',
    delta: base,
  });

  let bonus = 0;

  // High severity bonus — severity 4 (High) or 5 (Critical)
  if (input.severity >= 4) {
    bonus += POINTS.HIGH_SEVERITY;
    breakdown.push({
      reason: `High severity report (severity ${input.severity})`,
      delta: POINTS.HIGH_SEVERITY,
    });
  }

  // Novel campaign bonus — triage identified a new campaign pattern
  if (input.is_novel) {
    bonus += POINTS.NOVEL_CAMPAIGN;
    breakdown.push({
      reason: 'Novel campaign identified',
      delta: POINTS.NOVEL_CAMPAIGN,
    });
  }

  // Full metadata bonus — file + written context both submitted
  // Incentivises richer intelligence; does not apply to duplicates
  if (input.has_metadata && !isDuplicate) {
    bonus += POINTS.FULL_METADATA;
    breakdown.push({
      reason: 'Full metadata included',
      delta: POINTS.FULL_METADATA,
    });
  }

  const total = base + bonus;

  return {
    total,
    base,
    bonus,
    breakdown,
    ledger_reason: buildLedgerReason(base, bonus, breakdown),
  };
}

// ── Welcome bonus ────────────────────────────────────────────────────────────
// Awarded separately by the submit route on a user's very first submission.
// Kept outside calculatePoints so the logic stays pure — the submit route
// checks report count before calling this.

export function welcomeBonus(): PointsLineItem {
  return {
    reason: 'Welcome — first report submitted',
    delta: POINTS.WELCOME_BONUS,
  };
}

// ── Penalty helper ───────────────────────────────────────────────────────────
// Called by the moderation queue (Phase 2) when a report is flagged as spam.

export function spamPenalty(): PointsLineItem {
  return {
    reason: 'Report flagged as spam or abuse',
    delta: POINTS.SPAM_PENALTY,
  };
}

// ── Ledger reason string ─────────────────────────────────────────────────────
// Builds the human-readable string stored in points_ledger.reason.
// Mirrors the format from the Python reference: "base (Xpt) + reason, reason (Ypt bonus)"

function buildLedgerReason(
  base: number,
  bonus: number,
  breakdown: PointsLineItem[],
): string {
  const baseItem = breakdown[0];
  const bonusItems = breakdown.slice(1);

  let reason = `${baseItem.reason} (${base}pt)`;

  if (bonusItems.length > 0 && bonus > 0) {
    const bonusLabels = bonusItems.map((b) => b.reason).join(', ');
    reason += ` + ${bonusLabels} (${bonus}pt bonus)`;
  }

  return reason;
}
