/**
 * Utility functions for validating file uploads (images, videos, documents)
 * across the Admin panel.
 */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/avi',
  'video/x-msvideo'
];
export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi'];

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validates an image file by checking its type, extension, and size.
 * @param {File} file - The file object to validate.
 * @param {Object} options - Validation options.
 * @param {number} [options.maxSizeMB=5] - Maximum allowed file size in Megabytes.
 * @param {string[]} [options.allowedTypes=ALLOWED_IMAGE_TYPES] - Allowed MIME types.
 * @param {string[]} [options.allowedExtensions=ALLOWED_IMAGE_EXTENSIONS] - Allowed extensions.
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateImageFile = (file, options = {}) => {
  if (!file) {
    return { isValid: false, error: 'No image file selected.' };
  }

  const {
    maxSizeMB = 5,
    allowedTypes = ALLOWED_IMAGE_TYPES,
    allowedExtensions = ALLOWED_IMAGE_EXTENSIONS
  } = options;

  const fileName = file.name || '';
  const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const fileType = file.type?.toLowerCase() || '';

  const isMimeValid = allowedTypes.includes(fileType);
  const isExtValid = allowedExtensions.includes(fileExt);

  if (!isMimeValid && !isExtValid) {
    return {
      isValid: false,
      error: `Invalid image format (${fileExt || fileType || 'unknown'}). Allowed formats: JPG, JPEG, PNG, WebP.`
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `Image size (${sizeInMB}MB) exceeds the maximum limit of ${maxSizeMB}MB.`
    };
  }

  return { isValid: true, error: null };
};

/**
 * Asynchronously validates an image file by checking type, extension, size (in MB),
 * and image dimensions (1:1 square aspect ratio and min width/height).
 *
 * @param {File} file - The file to validate.
 * @param {Object} options - Validation options.
 * @param {number} [options.maxSizeMB=3] - Maximum size limit in MB.
 * @param {number} [options.minWidth=400] - Minimum required width.
 * @param {number} [options.minHeight=400] - Minimum required height.
 * @param {boolean} [options.requireSquare=true] - Whether 1:1 aspect ratio is required.
 * @returns {Promise<{ isValid: boolean, error: string | null }>}
 */
export const validateImageDimensionsAndSize = async (file, options = {}) => {
  const {
    maxSizeMB = 3,
    minWidth = 400,
    minHeight = 400,
    requireSquare = true
  } = options;

  const basicVal = validateImageFile(file, { maxSizeMB });
  if (!basicVal.isValid) {
    return basicVal;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (requireSquare) {
        const aspectRatio = width / height;
        if (aspectRatio < 0.95 || aspectRatio > 1.05) {
          resolve({
            isValid: false,
            error: `Image must have a 1:1 square aspect ratio. Uploaded dimensions: ${width}×${height} px.`
          });
          return;
        }
      }

      if (width < minWidth || height < minHeight) {
        resolve({
          isValid: false,
          error: `Image resolution too small (${width}×${height} px). Minimum required resolution is ${minWidth}×${minHeight} px.`
        });
        return;
      }

      resolve({ isValid: true, error: null });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ isValid: false, error: 'Could not read image file. Please select a valid image.' });
    };
  });
};

/**
 * Validates a video file by checking its type, extension, and size.
 * @param {File} file - The video file object.
 * @param {Object} options - Validation options.
 * @param {number} [options.maxSizeMB=10] - Maximum allowed video size in Megabytes.
 * @param {string[]} [options.allowedTypes=ALLOWED_VIDEO_TYPES] - Allowed MIME types.
 * @param {string[]} [options.allowedExtensions=ALLOWED_VIDEO_EXTENSIONS] - Allowed extensions.
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateVideoFile = (file, options = {}) => {
  if (!file) {
    return { isValid: false, error: 'No video file selected.' };
  }

  const {
    maxSizeMB = 10,
    allowedTypes = ALLOWED_VIDEO_TYPES,
    allowedExtensions = ALLOWED_VIDEO_EXTENSIONS
  } = options;

  const fileName = file.name || '';
  const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const fileType = file.type?.toLowerCase() || '';

  const isMimeValid = allowedTypes.includes(fileType) || fileType.startsWith('video/');
  const isExtValid = allowedExtensions.includes(fileExt);

  if (!isMimeValid && !isExtValid) {
    return {
      isValid: false,
      error: `Invalid video format (${fileExt || fileType || 'unknown'}). Allowed formats: MP4, WebM, MOV, MKV, AVI.`
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `Video size (${sizeInMB}MB) exceeds the maximum allowed limit of ${maxSizeMB}MB.`
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validates a video URL.
 * @param {string} url - The URL string to validate.
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateVideoUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { isValid: false, error: 'Video URL cannot be empty.' };
  }

  const trimmed = url.trim();

  // Allow relative upload paths
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    return { isValid: true, error: null };
  }

  // Check valid URL structure
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { isValid: false, error: 'Video URL must use HTTP or HTTPS protocol.' };
    }
  } catch (err) {
    return { isValid: false, error: 'Please enter a valid video URL (e.g., https://example.com/video.mp4).' };
  }

  return { isValid: true, error: null };
};

/**
 * Validates a document / ID proof file (PDF, Image).
 * @param {File} file - The file to validate.
 * @param {Object} options - Validation options.
 * @param {number} [options.maxSizeMB=10] - Max size limit.
 * @returns {{ isValid: boolean, error: string | null }}
 */
export const validateDocumentFile = (file, options = {}) => {
  if (!file) {
    return { isValid: false, error: 'No document file selected.' };
  }

  const {
    maxSizeMB = 10,
    allowedTypes = ALLOWED_DOCUMENT_TYPES,
    allowedExtensions = ALLOWED_DOCUMENT_EXTENSIONS
  } = options;

  const fileName = file.name || '';
  const fileExt = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const fileType = file.type?.toLowerCase() || '';

  const isMimeValid = allowedTypes.includes(fileType) || fileType === 'application/pdf' || fileType.startsWith('image/');
  const isExtValid = allowedExtensions.includes(fileExt);

  if (!isMimeValid && !isExtValid) {
    return {
      isValid: false,
      error: `Invalid document format (${fileExt || fileType || 'unknown'}). Allowed formats: PDF, JPG, PNG, WebP.`
    };
  }

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      isValid: false,
      error: `Document size (${sizeInMB}MB) exceeds the maximum limit of ${maxSizeMB}MB.`
    };
  }

  return { isValid: true, error: null };
};
