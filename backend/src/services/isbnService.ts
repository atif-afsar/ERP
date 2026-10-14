/**
 * Reusable ISBN validation and normalization service (DEF-LIB-005)
 * Deterministic, zero external dependencies, handles ISBN-10 and ISBN-13
 */

export interface IsbnValidationResult {
  isValid: boolean;
  normalized: string | null;
  error?: string;
}

/**
 * Normalizes an ISBN string by stripping whitespace and hyphens,
 * and uppercasing a final ISBN-10 'X' check character.
 * Returns null for empty or null/undefined values.
 */
export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (trimmed === '') return null;
  const stripped = trimmed.replace(/[\s-]+/g, '');
  if (stripped.length === 10) {
    return stripped.slice(0, 9) + stripped[9].toUpperCase();
  }
  return stripped;
}

/**
 * Validates the official ISBN-10 weighted checksum.
 * Formula: sum(i=0..8: (10 - i) * d_i) + checkDigit === 0 (mod 11)
 * Check digit can be 0-9 or 'X' (representing 10).
 */
export function validateIsbn10Checksum(canonical10: string): boolean {
  if (!/^\d{9}[\dX]$/.test(canonical10)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += (10 - i) * parseInt(canonical10[i], 10);
  }
  const checkChar = canonical10[9];
  const checkVal = checkChar === 'X' ? 10 : parseInt(checkChar, 10);
  sum += checkVal;
  return sum % 11 === 0;
}

/**
 * Validates the official ISBN-13 alternating 1/3 weighted checksum.
 * Formula: sum(i=0..12: (i % 2 === 0 ? 1 : 3) * d_i) === 0 (mod 10)
 */
export function validateIsbn13Checksum(canonical13: string): boolean {
  if (!/^\d{13}$/.test(canonical13)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(canonical13[i], 10);
    sum += (i % 2 === 0 ? 1 : 3) * digit;
  }
  return sum % 10 === 0;
}

/**
 * Authoritative validator and normalizer for user-supplied ISBN input.
 * Accepts ISBN-10 and ISBN-13 with standard human formatting (hyphens, spaces, 'X'/'x').
 * Rejects malformed strings, arbitrary text, invalid punctuation, and checksum mismatches.
 */
export function validateAndNormalizeIsbn(raw: unknown): IsbnValidationResult {
  if (raw === null || raw === undefined) {
    return { isValid: true, normalized: null };
  }

  if (typeof raw !== 'string') {
    return {
      isValid: false,
      normalized: null,
      error: 'A valid ISBN-10 or ISBN-13 is required.',
    };
  }

  const trimmed = raw.trim();
  if (trimmed === '') {
    return { isValid: true, normalized: null };
  }

  // Reject invalid characters (only digits, hyphens, spaces, and X/x allowed)
  if (/[^0-9\s\-xX]/.test(trimmed)) {
    return {
      isValid: false,
      normalized: null,
      error: 'A valid ISBN-10 or ISBN-13 is required. Punctuation other than spaces and hyphens is not allowed.',
    };
  }

  // Remove accepted spaces and hyphens
  const stripped = trimmed.replace(/[\s-]+/g, '');

  if (stripped.length === 10) {
    // ISBN-10 format: first 9 chars must be digits, 10th char can be digit or X/x
    if (!/^\d{9}[\dX]$/i.test(stripped)) {
      return {
        isValid: false,
        normalized: null,
        error: 'A valid ISBN-10 or ISBN-13 is required. For ISBN-10, only the final check character may be X.',
      };
    }
    const canonical = stripped.slice(0, 9) + stripped[9].toUpperCase();
    if (!validateIsbn10Checksum(canonical)) {
      return {
        isValid: false,
        normalized: null,
        error: 'A valid ISBN-10 or ISBN-13 is required. Invalid ISBN-10 checksum.',
      };
    }
    return { isValid: true, normalized: canonical };
  }

  if (stripped.length === 13) {
    // ISBN-13 format: all 13 characters must be digits (no letters or X)
    if (!/^\d{13}$/.test(stripped)) {
      return {
        isValid: false,
        normalized: null,
        error: 'A valid ISBN-10 or ISBN-13 is required. ISBN-13 must contain only digits.',
      };
    }
    if (!validateIsbn13Checksum(stripped)) {
      return {
        isValid: false,
        normalized: null,
        error: 'A valid ISBN-10 or ISBN-13 is required. Invalid ISBN-13 checksum.',
      };
    }
    return { isValid: true, normalized: stripped };
  }

  return {
    isValid: false,
    normalized: null,
    error: 'A valid ISBN-10 or ISBN-13 is required.',
  };
}
