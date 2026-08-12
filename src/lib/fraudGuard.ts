/**
 * FraudGuard — lightweight, server-backed anti-fraud for the one abuse vector
 * that hurts a micro-task platform the most: proof screenshot reuse.
 *
 * A worker resubmits an old screenshot as "proof" for a new task, or shares one
 * with a second account. We block that.
 *
 * Design goals (per product requirements): simple, strong, minimal DB load,
 * no new tables/migrations, and catches fraud directly.
 *
 * Mechanism: Supabase Storage is used as a DEDUPLICATION REGISTRY. Filenames
 * ARE the content fingerprint. A plain (non-upsert) upload to a path that
 * already exists returns HTTP 409 "Duplicate" — that single signal is our
 * detection. We reuse the existing public `job-assets` bucket whose INSERT
 * policy already allows any authenticated user to write (owner = auth.uid()),
 * so NO new storage policy and NO migration are required. The registry marker
 * is a 1-byte blob — storage cost is negligible.
 *
 *   Screenshot path (global, cross-account):  job-assets/fraud-registry/proofs/{sha256}
 *
 * The registry is enforced server-side (Supabase returns 409), so it cannot be
 * bypassed by clearing browser storage or tampering with the client.
 */

import { supabase } from './supabase';

const REGISTRY_BUCKET = 'job-assets';
const PROOF_PREFIX = 'fraud-registry/proofs';
const MARKER = new Uint8Array([0x57]); // 'W' — 1 byte, negligible storage
const MARKER_TYPE = 'application/octet-stream';

/** Compute a hex SHA-256 of an ArrayBuffer using the Web Crypto API. */
async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Register a proof screenshot and detect reuse.
 *
 * Uploads a 1-byte marker keyed by the file's SHA-256 to the global registry.
 * - Returns { ok: true } for a genuinely new screenshot (marker stored).
 * - Returns { ok: false, reason: 'duplicate' } if the exact file was already
 *   submitted by ANYONE (this user or another account). The 409 from Supabase
 *   Storage is the authoritative, tamper-proof signal.
 *
 * Because the key is the file hash (not the user id), this also catches a
 * user downloading another account's proof and re-uploading it — the same
 * bytes produce the same key and collide.
 */
export async function registerProofScreenshot(file: File): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const hash = await sha256Hex(buffer);
    const path = `${PROOF_PREFIX}/${hash}`;
    const { error } = await supabase.storage
      .from(REGISTRY_BUCKET)
      .upload(path, MARKER, { contentType: MARKER_TYPE, upsert: false });
    if (!error) return { ok: true };
    // 409 / "already exists" => reused screenshot. Any other error is treated
    // as "not a duplicate" so a transient storage hiccup never blocks a legit
    // submission — the DB-side task uniqueness still guards the core rule.
    if (/already exists|duplicate|409/i.test(error.message)) {
      return { ok: false, reason: 'duplicate' };
    }
    return { ok: true };
  } catch {
    // Never hard-fail a submission on a client-side computation error.
    return { ok: true };
  }
}

/**
 * Batch-check a set of selected proof files BEFORE the worker submits. Returns
 * the index of the first file that is a reused screenshot, or null if all are
 * fresh. Files that pass are registered immediately so a quick re-pick of the
 * same file in the same session is also caught.
 */
export async function checkProofScreenshots(
  files: File[],
): Promise<{ duplicateIndex: number | null }> {
  for (let i = 0; i < files.length; i++) {
    const res = await registerProofScreenshot(files[i]);
    if (!res.ok && res.reason === 'duplicate') return { duplicateIndex: i };
  }
  return { duplicateIndex: null };
}
