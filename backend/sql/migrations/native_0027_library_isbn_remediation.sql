-- Phase 11C: DEF-LIB-005 Library ISBN Remediation Table
-- Stores unresolved legacy ISBN collisions and invalid records to ensure
-- new writes cannot bypass valid legacy collisions and legacy data is tracked.

CREATE TABLE IF NOT EXISTS library_isbn_remediation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  raw_isbn VARCHAR(50) NOT NULL,
  canonical_isbn VARCHAR(13),
  classification VARCHAR(30) NOT NULL, -- 'VALID_COLLISION' | 'INVALID'
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_library_isbn_remediation_tenant_book UNIQUE (tenant_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_library_isbn_remediation_canonical
  ON library_isbn_remediation(tenant_id, canonical_isbn)
  WHERE canonical_isbn IS NOT NULL;
