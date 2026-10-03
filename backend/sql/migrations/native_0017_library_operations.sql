ALTER TABLE library_books ADD CONSTRAINT library_books_tenant_identity UNIQUE(id,tenant_id);
ALTER TABLE library_books ADD COLUMN lifecycle_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(lifecycle_status IN ('ACTIVE','INACTIVE','ARCHIVED'));
CREATE TABLE library_categories(id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),name VARCHAR(100) NOT NULL,UNIQUE(id,tenant_id),UNIQUE(tenant_id,name));
INSERT INTO library_categories(tenant_id,name) SELECT DISTINCT tenant_id,COALESCE(NULLIF(category,''),'General') FROM library_books;
ALTER TABLE library_books ADD COLUMN category_id UUID;
UPDATE library_books b SET category_id=c.id FROM library_categories c WHERE c.tenant_id=b.tenant_id AND c.name=COALESCE(NULLIF(b.category,''),'General');
ALTER TABLE library_books ADD FOREIGN KEY(category_id,tenant_id) REFERENCES library_categories(id,tenant_id);
CREATE TABLE book_copies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),book_id UUID NOT NULL,
 accession_number VARCHAR(100) NOT NULL,status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','LEGACY_HOLD','LOST','ARCHIVED')),
 FOREIGN KEY(book_id,tenant_id) REFERENCES library_books(id,tenant_id),UNIQUE(id,tenant_id),UNIQUE(tenant_id,accession_number)
);
-- Preserve untraceable legacy circulation as unavailable copies, never invent borrowers.
INSERT INTO book_copies(tenant_id,book_id,accession_number,status)
 SELECT b.tenant_id,b.id,b.id::text||'-'||n,CASE WHEN n<=GREATEST(0,COALESCE(b.total_copies,0)-COALESCE(b.available_copies,0)) THEN 'LEGACY_HOLD' ELSE 'ACTIVE' END
 FROM library_books b CROSS JOIN LATERAL generate_series(1,GREATEST(0,COALESCE(b.total_copies,0))) n;
CREATE TABLE library_loans (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id UUID NOT NULL REFERENCES tenants(id),copy_id UUID NOT NULL,
 student_id UUID,staff_id UUID,issued_on DATE NOT NULL,due_on DATE NOT NULL,returned_on DATE,
 status TEXT NOT NULL DEFAULT 'ISSUED' CHECK(status IN ('ISSUED','RETURNED','LOST')),
 CHECK(num_nonnulls(student_id,staff_id)=1),CHECK(due_on>=issued_on),
 CHECK((status='RETURNED' AND returned_on IS NOT NULL AND returned_on>=issued_on) OR (status<>'RETURNED' AND returned_on IS NULL)),
 FOREIGN KEY(copy_id,tenant_id) REFERENCES book_copies(id,tenant_id),
 FOREIGN KEY(student_id,tenant_id) REFERENCES students(id,tenant_id),FOREIGN KEY(staff_id,tenant_id) REFERENCES staff(id,tenant_id)
);
CREATE UNIQUE INDEX library_one_active_loan ON library_loans(copy_id) WHERE status='ISSUED';
INSERT INTO permissions(key,name,description,module) VALUES
 ('library.view','View library','View tenant catalog and loans','library'),('library.manage','Manage library','Manage titles and physical copies','library'),('library.issue','Issue library copies','Issue and return copies','library') ON CONFLICT(key) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.key IN ('SUPER_ADMIN','TENANT_ADMIN') AND p.key LIKE 'library.%' ON CONFLICT DO NOTHING;
