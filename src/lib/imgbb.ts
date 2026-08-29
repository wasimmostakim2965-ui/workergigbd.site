/**
 * ImgBB upload helper — moves disposable images (task proofs, job images, ad
 * banners) OFF Supabase Storage so the free 1 GB storage / 5 GB egress quota
 * is never the bottleneck at scale. Only the returned URL string is stored in
 * our database, exactly where a Supabase public URL used to live, so nothing
 * downstream changes.
 *
 * Design rules:
 * - Direct browser -> ImgBB (the bytes never touch Vercel or Supabase).
 * - The API key is intentionally public on the client: these images are
 *   worthless and public by product decision. Worst case abuse costs us $0.
 * - We compress large images client-side first (canvas) so uploads are fast
 *   on slow connections and stay well under any host limit.
 * - If ImgBB is unreachable or errors, we throw a normal Error with a clear
 *   message — callers already surface it to the user, nothing hangs.
 * - No `expiration` param: we keep URLs alive and let our own job cleanup
 *   lifecycle (which deletes finished jobs) be the source of truth. ImgBB is
 *   a cache-like convenience store, not the audit log.
 */

const IMGBB_API_KEY = (import.meta.env.VITE_IMGBB_API_KEY as string | undefined) ?? '';
const UPLOAD_URL = 'https://api.imgbb.com/1/upload';

// Compress anything above this before upload. Proof screenshots from phones
// are routinely 3-8 MB; ~1 MB is a comfortable target that keeps text legible.
const COMPRESS_ABOVE_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1920; // px, longest edge — plenty for reviewing a screenshot
const JPEG_QUALITY = 0.85;

async function maybeCompress(file: File): Promise<Blob> {
  // GIFs can be animated; re-encoding to a static frame would break them, so
  // we send them through as-is.
  if (file.size <= COMPRESS_ABOVE_BYTES || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    // Only use the compressed version if it actually got smaller.
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // Any decode/canvas issue -> fall back to the original file. Never block.
    return file;
  }
}

export interface ImgbbResult {
  /** Direct image URL (i.ibb.co) — what we store in the database. */
  url: string;
  /** The hosted viewer page — not stored, available if ever needed. */
  viewerUrl?: string;
}

/**
 * Upload a single image to ImgBB and return its direct URL.
 * Throws an Error with a readable message on failure.
 */
export async function uploadToImgbb(file: File, name?: string): Promise<ImgbbResult> {
  if (!IMGBB_API_KEY) {
    throw new Error('Image hosting is not configured (missing VITE_IMGBB_API_KEY).');
  }

  const payload = await maybeCompress(file);
  const form = new FormData();
  form.append('key', IMGBB_API_KEY);
  const filename = name ?? file.name ?? 'image';
  form.append('image', payload, filename);

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Image upload failed (HTTP ${res.status}).`);
  }

  if (!res.ok || !data?.success || !data?.data?.url) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Image upload failed: ${msg}`);
  }

  return { url: data.data.url as string, viewerUrl: data.data.url_viewer };
}
