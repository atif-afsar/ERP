import { validateAndNormalizeIsbn } from './lib/isbn_v1.mjs';

/**
 * Classifies all existing rows in library_books where isbn is non-blank.
 * 
 * Outcomes per tenant:
 * - VALID_UNIQUE: Valid ISBN, unique within tenant among normalized and unnormalized.
 *   Sets isbn_normalized = canonical value. Original raw isbn preserved.
 * - VALID_COLLISION: Valid ISBN, but collides with an already normalized title or another
 *   valid legacy title in the same tenant. isbn_normalized remains NULL.
 *   Recorded in library_isbn_remediation with canonical_isbn.
 * - INVALID: Fails format or checksum validation. isbn_normalized remains NULL.
 *   Recorded in library_isbn_remediation with canonical_isbn = NULL.
 * - BLANK: Whitespace-only or NULL. isbn_normalized remains NULL.
 * 
 * Repeatable, idempotent, safe under concurrent locks (FOR UPDATE).
 */
export async function classifyAndBackfillLibraryIsbns(client) {
  // 1. Lock all rows in library_books that have a non-blank raw isbn
  const rowsRes = await client.query(`
    SELECT id, tenant_id, title, isbn, isbn_normalized
    FROM library_books
    WHERE isbn IS NOT NULL AND BTRIM(isbn) <> ''
    ORDER BY tenant_id, id
    FOR UPDATE
  `);

  // Group books by tenant
  const tenantsMap = new Map();
  for (const row of rowsRes.rows) {
    if (!tenantsMap.has(row.tenant_id)) {
      tenantsMap.set(row.tenant_id, []);
    }
    tenantsMap.get(row.tenant_id).push(row);
  }

  const results = {
    totalInspected: rowsRes.rowCount,
    validUniqueBackfilled: 0,
    validCollisions: 0,
    invalidRetained: 0,
    blankRetained: 0,
    details: [],
  };

  // Process tenant by tenant (strict tenant isolation)
  for (const [tenantId, books] of tenantsMap.entries()) {
    // Collect already normalized canonical ISBNs in this tenant
    const alreadyNormalized = new Set();
    for (const b of books) {
      if (b.isbn_normalized !== null && b.isbn_normalized !== undefined && b.isbn_normalized !== '') {
        alreadyNormalized.add(b.isbn_normalized);
      }
    }

    // Only process unnormalized rows
    const unnormalized = books.filter(b => b.isbn_normalized === null || b.isbn_normalized === undefined || b.isbn_normalized === '');

    const canonicalGroups = new Map(); // canonical -> array of book objects
    const invalidBooks = [];

    for (const b of unnormalized) {
      const res = validateAndNormalizeIsbn(b.isbn);
      if (!res.isValid) {
        invalidBooks.push({ book: b, error: res.error || 'Invalid ISBN format or checksum' });
      } else if (res.normalized === null) {
        // Blank or whitespace-only - leave isbn_normalized = NULL
        results.blankRetained++;
      } else {
        const canonical = res.normalized;
        if (!canonicalGroups.has(canonical)) {
          canonicalGroups.set(canonical, []);
        }
        canonicalGroups.get(canonical).push(b);
      }
    }

    // Process invalid records: record in library_isbn_remediation
    for (const inv of invalidBooks) {
      await client.query(`
        INSERT INTO library_isbn_remediation (tenant_id, book_id, raw_isbn, canonical_isbn, classification, reason)
        VALUES ($1, $2, $3, NULL, 'INVALID', $4)
        ON CONFLICT (tenant_id, book_id) DO UPDATE
        SET canonical_isbn = EXCLUDED.canonical_isbn,
            classification = EXCLUDED.classification,
            reason = EXCLUDED.reason,
            updated_at = NOW()
      `, [tenantId, inv.book.id, inv.book.isbn, inv.error]);

      results.invalidRetained++;
      results.details.push({
        bookId: inv.book.id,
        tenantId,
        rawIsbn: inv.book.isbn,
        canonical: null,
        classification: 'INVALID',
        reason: inv.error,
      });
    }

    // Process valid records: evaluate for uniqueness vs collision
    for (const [canonical, group] of canonicalGroups.entries()) {
      const collidesWithAlreadyNormalized = alreadyNormalized.has(canonical);
      const isDuplicateGroup = group.length > 1;

      if (collidesWithAlreadyNormalized || isDuplicateGroup) {
        // VALID_COLLISION:
        // Do NOT guess an authoritative winner. All conflicting rows remain isbn_normalized = NULL.
        const reason = collidesWithAlreadyNormalized
          ? `Collides with an already-normalized title in this institution (canonical: ${canonical})`
          : `Collides with ${group.length - 1} other legacy title(s) in this institution (canonical: ${canonical})`;

        for (const b of group) {
          await client.query(`
            INSERT INTO library_isbn_remediation (tenant_id, book_id, raw_isbn, canonical_isbn, classification, reason)
            VALUES ($1, $2, $3, $4, 'VALID_COLLISION', $5)
            ON CONFLICT (tenant_id, book_id) DO UPDATE
            SET canonical_isbn = EXCLUDED.canonical_isbn,
                classification = EXCLUDED.classification,
                reason = EXCLUDED.reason,
                updated_at = NOW()
          `, [tenantId, b.id, b.isbn, canonical, reason]);

          results.validCollisions++;
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
        // Unique in the institution. Safe to backfill.
        const b = group[0];
        await client.query(`
          UPDATE library_books
          SET isbn_normalized = $1
          WHERE id = $2 AND isbn_normalized IS NULL
        `, [canonical, b.id]);

        alreadyNormalized.add(canonical);
        results.validUniqueBackfilled++;

        // Delete from remediation if it was previously there
        await client.query(`
          DELETE FROM library_isbn_remediation
          WHERE tenant_id = $1 AND book_id = $2
        `, [tenantId, b.id]);

        results.details.push({
          bookId: b.id,
          tenantId,
          rawIsbn: b.isbn,
          canonical,
          classification: 'VALID_UNIQUE',
          reason: 'Safely backfilled unique canonical ISBN',
        });
      }
    }
  }

  return results;
}

export async function up(client) {
  const summary = await classifyAndBackfillLibraryIsbns(client);
  console.log(`[native_0028_library_isbn_legacy_backfill] Inspected: ${summary.totalInspected}, Backfilled unique: ${summary.validUniqueBackfilled}, Valid collisions: ${summary.validCollisions}, Invalid: ${summary.invalidRetained}`);
}
