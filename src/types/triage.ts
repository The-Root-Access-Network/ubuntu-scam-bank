// src/types/triage.ts

// Types for the AI triage pipeline.
// Source of truth lives in src/lib/ai/triage.ts —
// re-exported here so consumer code can import from @/types
// without reaching into lib internals.

export type {
  ScamType,
  IndicatorType,
  TriageIndicator,
  TriageResult,
  ImageMimeType,
} from '@/lib/ai/triage';
