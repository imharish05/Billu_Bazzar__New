'use strict';
const fs = require('fs');
const path = require('path');

/**
 * Safely delete a local file from disk under /uploads/ directory.
 * Protects default, placeholder, sample, and logo assets from being deleted.
 * 
 * @param {string} imagePath - Relative path starting with '/uploads/' (e.g., '/uploads/products/abc.jpg')
 */
const deleteLocalFile = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return;

  const normalized = imagePath.trim().toLowerCase();

  // Safeguard: Never delete default, placeholder, sample, logo, or non-uploads assets
  if (
    !imagePath.startsWith('/uploads/') ||
    normalized.includes('default') ||
    normalized.includes('placeholder') ||
    normalized.includes('sample') ||
    normalized.includes('logo') ||
    normalized.includes('no-image')
  ) {
    console.log(`[Upload Safeguard] Preserved default/shared image asset: ${imagePath}`);
    return;
  }

  // Calculate local absolute path
  const relativeSubpath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
  const localPath = path.join(__dirname, '..', relativeSubpath);

  try {
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`[Upload] Deleted local file: ${localPath}`);
    }
  } catch (err) {
    console.error(`[Upload] Error deleting local file (${imagePath}): ${err.message}`);
  }
};

module.exports = { deleteLocalFile };
