'use strict';

/**
 * Robust variant attribute parser and formatter.
 * Handles double/triple stringified JSON safely.
 */
export const formatVariantName = (rawVar) => {
  if (!rawVar) return null;
  let parsed = rawVar;

  // Unpack nested JSON strings if present
  for (let i = 0; i < 5; i++) {
    if (typeof parsed === 'string') {
      const trimmed = parsed.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          const next = JSON.parse(parsed);
          if (next === parsed) break;
          parsed = next;
        } catch {
          break;
        }
      } else {
        break;
      }
    } else {
      break;
    }
  }

  if (Array.isArray(parsed) && parsed.length > 0) {
    parsed = parsed[0];
  }

  if (parsed && typeof parsed === 'object') {
    if (typeof parsed.variantName === 'string' && parsed.variantName.trim()) {
      return parsed.variantName.trim();
    }
    if (typeof parsed.name === 'string' && parsed.name.trim() && !parsed.name.includes('{')) {
      return parsed.name.trim();
    }
    if (typeof parsed.variant === 'string' && parsed.variant.trim() && !parsed.variant.includes('{')) {
      return parsed.variant.trim();
    }

    const entries = Object.entries(parsed).filter(
      ([k, v]) =>
        v !== undefined &&
        v !== null &&
        v !== '' &&
        !['id', 'createdAt', 'updatedAt', 'productId', 'price', 'stock', 'sku', 'image', 'gstRate', 'variantId'].includes(k)
    );

    if (entries.length > 0) {
      return entries
        .map(([k, v]) => (k.toLowerCase() === 'variant' ? String(v) : `${k}: ${v}`))
        .join(' · ');
    }
  }

  if (typeof parsed === 'string' && parsed !== '{}' && parsed !== '[]') {
    return parsed;
  }

  return null;
};
