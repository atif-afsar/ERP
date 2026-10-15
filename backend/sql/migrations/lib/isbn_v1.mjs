/**
 * Immutable Versioned Migration Helper: ISBN v1
 * 
 * Freezes authoritative ISBN-10 / ISBN-13 normalization, checksum validation,
 * and deterministic legacy classification logic.
 * 
 * POLICY:
 * - This file is immutable once released.
 * - Any future changes to ISBN rules must create a new version (e.g. isbn_v2.mjs).
 * - Migrations must import versioned helpers, NEVER mutable runtime application services.
 */

/**
 * Normalizes an ISBN string by stripping whitespace and hyphens,
 * and uppercasing a final ISBN-10 'X' check character.
 * Returns null for empty or null/undefined values.
 */
export function normalizeIsbn(raw) {
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
export function validateIsbn10Checksum(canonical10) {
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
export function validateIsbn13Checksum(canonical13) {
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
export function validateAndNormalizeIsbn(raw) {
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

/**
 * Reconciles and classifies all library_books records with non-blank raw ISBN values
 * against the frozen ISBN v1 specification.
 * 
 * Invariants:
 * - Locks rows with FOR UPDATE ordered by tenant_id, id.
 * - VALID_UNIQUE -> sets isbn_normalized = canonical_isbn.
 * - VALID_COLLISION -> sets isbn_normalized = NULL, logs to library_isbn_remediation with canonical_isbn.
 * - INVALID -> sets isbn_normalized = NULL, logs to library_isbn_remediation with canonical_isbn = NULL.
 * - BLANK -> sets isbn_normalized = NULL.
 * - Never modifies title names, authors, copies, loans, categories, or raw isbn values.
 * - Idempotent across repeated executions.
 */
export async function reconcileLegacyIsbns(client) {
  // Ensure remediation storage exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS library_isbn_remediation (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
      raw_isbn VARCHAR(50) NOT NULL,
      canonical_isbn VARCHAR(13),
      classification VARCHAR(30) NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT uq_library_isbn_remediation_tenant_book UNIQUE (tenant_id, book_id)
    );
    CREATE INDEX IF NOT EXISTS idx_library_isbn_remediation_canonical
      ON library_isbn_remediation(tenant_id, canonical_isbn)
      WHERE canonical_isbn IS NOT NULL;
  `);

  // Lock target rows to prevent race conditions during classification
  const rowsRes = await client.query(`
    SELECT id, tenant_id, title, isbn, isbn_normalized
    FROM library_books
    WHERE isbn IS NOT NULL AND BTRIM(isbn) <> ''
    ORDER BY tenant_id, id
    FOR UPDATE
  `);

  // Group by tenant
  const tenantsMap = new Map();
  for (const row of rowsRes.rows) {
    if (!tenantsMap.has(row.tenant_id)) {
      tenantsMap.set(row.tenant_id, []);
    }
    tenantsMap.get(row.tenant_id).push(row);
  }

  const results = {
    totalInspected: rowsRes.rowCount,
    validUnique: 0,
    validCollisions: 0,
    invalid: 0,
    blank: 0,
    updatedRows: 0,
    details: [],
  };

  for (const [tenantId, books] of tenantsMap.entries()) {
    // 1. Separate into already-normalized valid rows and unnormalized / pending rows
    const alreadyNormalizedMap = new Map(); // canonical -> row[]
    const unnormalized = [];
    const invalidBooks = [];

    for (const b of books) {
      const res = validateAndNormalizeIsbn(b.isbn);
      if (!res.isValid) {
        invalidBooks.push({ book: b, error: res.error || 'Invalid ISBN format or checksum' });
      } else if (res.normalized === null) {
        results.blank++;
      } else {
        const canonical = res.normalized;
        const isAlreadyNormalized = (b.isbn_normalized !== null && b.isbn_normalized !== undefined && b.isbn_normalized === canonical);

        if (isAlreadyNormalized) {
          if (!alreadyNormalizedMap.has(canonical)) {
            alreadyNormalizedMap.set(canonical, []);
          }
          alreadyNormalizedMap.get(canonical).push(b);
        } else {
          unnormalized.push({ book: b, canonical });
        }
      }
    }

    // 2. Reconcile invalid books: must have isbn_normalized = NULL and exist in remediation
    for (const inv of invalidBooks) {
      results.invalid++;
      if (inv.book.isbn_normalized !== null) {
        await client.query(`
          UPDATE library_books
          SET isbn_normalized = NULL
          WHERE id = $1
        `, [inv.book.id]);
        results.updatedRows++;
      }

      await client.query(`
        INSERT INTO library_isbn_remediation (tenant_id, book_id, raw_isbn, canonical_isbn, classification, reason)
        VALUES ($1, $2, $3, NULL, 'INVALID', $4)
        ON CONFLICT (tenant_id, book_id) DO UPDATE
        SET canonical_isbn = EXCLUDED.canonical_isbn,
            classification = EXCLUDED.classification,
            reason = EXCLUDED.reason,
            updated_at = NOW()
      `, [tenantId, inv.book.id, inv.book.isbn, inv.error]);

      results.details.push({
        bookId: inv.book.id,
        tenantId,
        rawIsbn: inv.book.isbn,
        canonical: null,
        classification: 'INVALID',
        reason: inv.error,
      });
    }

    // 3. Group unnormalized books by canonical
    const unnormalizedGroups = new Map();
    for (const item of unnormalized) {
      if (!unnormalizedGroups.has(item.canonical)) {
        unnormalizedGroups.set(item.canonical, []);
      }
      unnormalizedGroups.get(item.canonical).push(item.book);
    }

    // 4. Reconcile valid unnormalized records against existing normalized titles & intra-group collisions
    for (const [canonical, group] of unnormalizedGroups.entries()) {
      const existingNormalized = alreadyNormalizedMap.get(canonical) || [];

      if (existingNormalized.length > 0) {
        // Collision with an already-normalized row:
        // PRESERVE the already-normalized row(s); record legacy conflict for unnormalized row(s).
        results.validCollisions += group.length;
        const reason = `Collides with an already-normalized title in this institution (canonical: ${canonical})`;

        for (const b of group) {
          if (b.isbn_normalized !== null) {
            await client.query(`
              UPDATE library_books
              SET isbn_normalized = NULL
              WHERE id = $1
            `, [b.id]);
            results.updatedRows++;
          }

          await client.query(`
            INSERT INTO library_isbn_remediation (tenant_id, book_id, raw_isbn, canonical_isbn, classification, reason)
            VALUES ($1, $2, $3, $4, 'VALID_COLLISION', $5)
            ON CONFLICT (tenant_id, book_id) DO UPDATE
            SET canonical_isbn = EXCLUDED.canonical_isbn,
                classification = EXCLUDED.classification,
                reason = EXCLUDED.reason,
                updated_at = NOW()
          `, [tenantId, b.id, b.isbn, canonical, reason]);

          results.details.push({
            bookId: b.id,
            tenantId,
            rawIsbn: b.isbn,
            canonical,
            classification: 'VALID_COLLISION',
            reason,
          });
        }
      } else if (group.length > 1) {
        // Intra-legacy collision:
        // Multiple unnormalized legacy titles share the same canonical ISBN within this tenant.
        // No arbitrary winner chosen; all conflicting rows MUST have isbn_normalized = NULL.
        results.validCollisions += group.length;
        const reason = `Collides with ${group.length - 1} other legacy title(s) in this institution (canonical: ${canonical})`;

        for (const b of group) {
          if (b.isbn_normalized !== null) {
            await client.query(`
              UPDATE library_books
              SET isbn_normalized = NULL
              WHERE id = $1
            `, [b.id]);
            results.updatedRows++;
          }

          await client.query(`
            INSERT INTO library_isbn_remediation (tenant_id, book_id, raw_isbn, canonical_isbn, classification, reason)
            VALUES ($1, $2, $3, $4, 'VALID_COLLISION', $5)
            ON CONFLICT (tenant_id, book_id) DO UPDATE
            SET canonical_isbn = EXCLUDED.canonical_isbn,
                classification = EXCLUDED.classification,
                reason = EXCLUDED.reason,
                updated_at = NOW()
          `, [tenantId, b.id, b.isbn, canonical, reason]);

          results.details.push({
            bookId: b.id,
            tenantId,
            rawIsbn: b.isbn,
            canonical,
            classification: 'VALID_COLLISION',
            reason,
          });
        }
      } else {
        // VALID_UNIQUE:
        // Exactly one title in this tenant has this canonical ISBN. Safe to populate isbn_normalized.
        results.validUnique++;
        const b = group[0];
        if (b.isbn_normalized !== canonical) {
          await client.query(`
            UPDATE library_books
            SET isbn_normalized = $1
            WHERE id = $2
          `, [canonical, b.id]);
          results.updatedRows++;
        }

        // Clean up from remediation if it was previously there
        await client.query(`
          DELETE FROM library_isbn_remediation
          WHERE tenant_id = $1 AND book_id = $2
        `, [tenantId, b.id]);

        alreadyNormalizedMap.set(canonical, [b]);

        results.details.push({
          bookId: b.id,
          tenantId,
          rawIsbn: b.isbn,
          canonical,
          classification: 'VALID_UNIQUE',
          reason: 'Verified unique canonical ISBN under frozen v1 specification',
        });
      }
    }
  }

  return results;
}
