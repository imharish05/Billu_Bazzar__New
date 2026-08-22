'use strict';
const fs = require('fs');
const path = require('path');
const { detectRealImageType } = require('../middleware/imageContentType');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const SPIN_ROOT = path.join(UPLOADS_ROOT, 'spin');
const DEFAULT_EXT = 'jpg';

const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
};

/**
 * react-360-view's <ThreeSixty> component needs one folder with
 * sequentially-named, same-extension files (imagePath + fileName
 * pattern like "frame_{index}.jpg"). Admin uploads arrive as
 * arbitrary multer filenames, so this rebuilds a clean numbered set
 * — in upload order — every time a product's spin frames change.
 *
 * No image library (sharp, jimp, etc) is used here — those need
 * native/WASM binaries that some shared hosts (e.g. Webuzo) refuse to
 * build. This just copies the raw bytes to a new filename, no
 * re-encoding, resizing, or EXIF handling.
 *
 * IMPORTANT: this used to force every frame onto the extension of the
 * FIRST uploaded frame (copying e.g. a PNG's bytes into a "frame_3.jpg"
 * file). That's wrong: express.static sets the Content-Type response
 * header from the file EXTENSION only, so a browser fetching that file
 * was told "this is a JPEG" while receiving PNG bytes, and its JPEG
 * decoder painted garbage — visible as blocky pixel corruption during
 * the spin. Each frame's real format is now sniffed from its magic
 * bytes and it keeps ITS OWN correct extension, even in a mixed-format
 * set. spinImageExt still reports the first frame's real (sniffed)
 * extension for backward-compat callers that assume one uniform
 * extension; mixed-format sets are logged so it's visible in admin logs
 * rather than silently corrupting.
 *
 * @param {number} productId
 * @param {string[]} orderedRelativeUrls  e.g. ["/uploads/products/abc.png", ...]
 * @returns {{ spinImagePath: string|null, spinImageCount: number, spinImageExt: string }}
 */
function materializeSpinSequence(productId, orderedRelativeUrls = []) {
  const destDir = path.join(SPIN_ROOT, String(productId));

  // Always start clean so removed/reordered frames don't leave stale files behind
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }

  const urls = (orderedRelativeUrls || []).filter(Boolean);
  if (urls.length === 0) {
    return { spinImagePath: null, spinImageCount: 0, spinImageExt: DEFAULT_EXT };
  }

  fs.mkdirSync(destDir, { recursive: true });

  let frameNumber = 1;
  let firstRealExt = null;
  let sawMixedFormats = false;

  for (const url of urls) {
    const sourcePath = resolveLocalPath(url);
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      console.warn(`[SpinSequence] Skipping missing source frame: ${url}`);
      continue;
    }

    const realMime = detectRealImageType(sourcePath);
    const realExt = (realMime && MIME_TO_EXT[realMime]) || extOf(url) || DEFAULT_EXT;

    if (firstRealExt === null) {
      firstRealExt = realExt;
    } else if (realExt !== firstRealExt) {
      sawMixedFormats = true;
    }

    const destPath = path.join(destDir, `frame_${frameNumber}.${realExt}`);
    try {
      fs.copyFileSync(sourcePath, destPath);
      frameNumber += 1;
    } catch (err) {
      console.error(`[SpinSequence] Failed copying frame ${url}: ${err.message}`);
    }
  }

  if (sawMixedFormats) {
    console.warn(`[SpinSequence] Product ${productId}: spin frames mix image formats. Each frame kept its own real extension — fine for rendering, but consider re-exporting all frames in one format for consistency.`);
  }

  const count = frameNumber - 1;
  if (count === 0) {
    fs.rmSync(destDir, { recursive: true, force: true });
    return { spinImagePath: null, spinImageCount: 0, spinImageExt: DEFAULT_EXT };
  }

  return {
    spinImagePath: `/uploads/spin/${productId}/`,
    spinImageCount: count,
    spinImageExt: firstRealExt || DEFAULT_EXT,
  };
}

/** Remove a product's materialized spin folder entirely (e.g. on product delete). */
function deleteSpinSequence(productId) {
  const destDir = path.join(SPIN_ROOT, String(productId));
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
}

/** Map a stored "/uploads/..." URL back to its file on disk. */
function resolveLocalPath(relativeUrl) {
  if (!relativeUrl || typeof relativeUrl !== 'string') return null;
  const idx = relativeUrl.indexOf('/uploads/');
  if (idx === -1) return null;
  const cleanPath = relativeUrl.substring(idx + 1);
  return path.join(__dirname, '..', cleanPath);
}

/** Extract a lowercase extension (no dot) from a URL/path, or null. */
function extOf(url) {
  const ext = path.extname(url || '').replace('.', '').toLowerCase();
  return ext || null;
}

module.exports = { materializeSpinSequence, deleteSpinSequence };