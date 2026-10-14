-- Phase 11C: DEF-LIB-005 Library ISBN Safety & Uniqueness
-- Add additive normalized ISBN column and tenant-scoped partial unique index

ALTER TABLE library_books ADD COLUMN IF NOT EXISTS isbn_normalized VARCHAR(13);

-- Note on legacy data:
-- Existing legacy ISBN records in the database contain malformed checksums and duplicate values.
-- As per the DEF-LIB-005 data safety strategy, existing legacy records are preserved untouched with
-- isbn_normalized = NULL. New titles with valid ISBNs populate both isbn and isbn_normalized.

CREATE UNIQUE INDEX IF NOT EXISTS library_books_tenant_isbn_normalized_uidx
  ON library_books (tenant_id, isbn_normalized)
  WHERE isbn_normalized IS NOT NULL;
