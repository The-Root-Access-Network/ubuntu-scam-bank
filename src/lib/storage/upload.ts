// src/lib/storage/upload.ts

/**
 * @params file - The file to upload
 * @params userId - The ID of the user submitting the file
 * @params reportId - The ID of the report to which the file belongs
 * Handles file uploads for scam reports, including validation, metadata stripping, text extraction, and storage in Supabase.
 *
 * This module is used by the submit route when a user attaches a file to their report.
 * It ensures that only allowed file types are accepted, that files are not too large,
 * and that JPEG images have their EXIF metadata stripped to protect user privacy.
 *
 * Called exclusively from /api/submit — never from the browser directly.
 * Uses the server-side Supabase client (service role) so no client auth needed.
 *
 * The main export is the async function uploadSubmissionFile, which takes a File
 * object along with the user ID and report ID for storage path construction.
 * It returns an UploadResult containing the storage path, MIME type, and any
 * extracted text content for use in the triage pipeline.
 */

import { createClient } from '@/lib/supabase/server';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const BUCKET = 'scam-reports';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'message/rfc822': 'eml',
  'application/pdf': 'pdf',
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  path: string; // storage path — stored in reports.file_path
  file_type: string; // MIME type — stored in reports.file_type
  text: string; // extracted text content for triage pipeline
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_TYPE' | 'TOO_LARGE' | 'STORAGE_ERROR',
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function uploadSubmissionFile(
  file: File,
  userId: string,
  reportId: string,
): Promise<UploadResult> {
  // ── Validation ───────────────────────────────────────────────────────────
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError(
      `File type ${file.type} is not accepted. Allowed: JPEG, PNG, WebP, TXT, EML, PDF.`,
      'INVALID_TYPE',
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new UploadError(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.`,
      'TOO_LARGE',
    );
  }

  // ── Read file ────────────────────────────────────────────────────────────
  const rawBuffer = await file.arrayBuffer();

  // ── Metadata stripping ────────────────────────────────────────────────────
  // JPEG photos are the main risk — EXIF can contain GPS coordinates,
  // device serial numbers, and timestamps that identify the victim.
  // Other formats are stored as-is; Claude's PII scrub handles text content.
  const cleanBuffer =
    file.type === 'image/jpeg' ? stripJpegExif(rawBuffer) : rawBuffer;

  // ── Text extraction ───────────────────────────────────────────────────────
  // The triage pipeline analyses text. Extract what we can; for binary
  // formats (images, PDF) the submit route falls back to any pasted text.
  const text = await extractText(file.type, rawBuffer);

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const supabase = await createClient();
  const path = `${userId}/${reportId}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, cleanBuffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('[upload] Storage error:', error);
    throw new UploadError(
      `Storage upload failed: ${error.message}`,
      'STORAGE_ERROR',
    );
  }

  return { path, file_type: file.type, text };
}

// ── JPEG EXIF stripper ────────────────────────────────────────────────────────
// Pure JavaScript — works on Cloudflare Workers and Node.js alike.
// Scans JPEG APP segments and removes all except APP0 (JFIF header).
// APP1 carries EXIF (GPS, device info), APP2–15 carry ICC profiles etc.
// The resulting image is visually identical — only the metadata is gone.

function stripJpegExif(buffer: ArrayBuffer): ArrayBuffer {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // Verify JPEG SOI marker (0xFFD8)
  if (bytes.length < 2 || view.getUint16(0) !== 0xffd8) {
    return buffer; // Not a JPEG — return unchanged
  }

  const out: number[] = [0xff, 0xd8]; // Write SOI
  let i = 2;

  while (i < bytes.length - 1) {
    // Every JPEG marker starts with 0xFF
    if (bytes[i] !== 0xff) break;

    const marker = view.getUint16(i);

    // EOI — end of image
    if (marker === 0xffd9) {
      out.push(0xff, 0xd9);
      break;
    }

    // SOS — start of scan: rest of file is compressed image data, copy verbatim
    if (marker === 0xffda) {
      for (let j = i; j < bytes.length; j++) out.push(bytes[j]);
      break;
    }

    // APP0–APP15 (0xFFE0–0xFFEF): only keep APP0 (JFIF), strip the rest
    if (marker >= 0xffe0 && marker <= 0xffef) {
      const segLen = view.getUint16(i + 2); // includes the 2-byte length field
      if (marker === 0xffe0) {
        // Keep JFIF APP0
        for (let j = i; j < i + 2 + segLen; j++) out.push(bytes[j]);
      }
      // All other APP segments (EXIF, XMP, ICC, Photoshop…) are dropped
      i += 2 + segLen;
      continue;
    }

    // All other markers (DQT, SOF, DHT, DRI…): keep verbatim
    const segLen = view.getUint16(i + 2);
    for (let j = i; j < i + 2 + segLen; j++) out.push(bytes[j]);
    i += 2 + segLen;
  }

  return new Uint8Array(out).buffer;
}

// ── Text extraction ───────────────────────────────────────────────────────────
// Pulls readable text from formats where it's straightforward.
// Images and PDFs return an empty string — the submit route falls back
// to any text the user pasted in the context field.

async function extractText(
  mimeType: string,
  buffer: ArrayBuffer,
): Promise<string> {
  try {
    switch (mimeType) {
      case 'text/plain':
      case 'message/rfc822': {
        // EML files are plain text with MIME headers — decode as UTF-8
        return new TextDecoder('utf-8', { fatal: false }).decode(buffer);
      }
      default:
        // image/* and application/pdf — no text extraction in this runtime
        // Claude will analyse whatever text the user provided separately
        return '';
    }
  } catch {
    return '';
  }
}
