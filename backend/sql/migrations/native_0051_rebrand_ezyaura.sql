-- Migration: native_0051_rebrand_ezyaura.sql
-- Description: The product is renamed EduNexus -> EzyAura. Rewrites the brand
-- name in text that earlier migrations stored in the database: email/in-app
-- templates, assistant help articles, permission descriptions and the Super
-- Admin platform tenant. Internal identifiers (slugs, DB names) are unchanged.
-- Platform payment settings (payee name, UPI ID) are real payment details and
-- are left for the Super Admin to edit. Safe to re-run.

UPDATE notification_templates SET
  subject_template = replace(subject_template, 'EduNexus', 'EzyAura'),
  body_template = replace(body_template, 'EduNexus', 'EzyAura')
WHERE subject_template LIKE '%EduNexus%' OR body_template LIKE '%EduNexus%';

UPDATE ai_knowledge_documents SET title = replace(title, 'EduNexus', 'EzyAura'), updated_at = NOW()
WHERE tenant_id IS NULL AND title LIKE '%EduNexus%';

-- search_vector is a generated column, so the full-text index follows the new text.
UPDATE ai_knowledge_chunks SET
  heading = replace(heading, 'EduNexus', 'EzyAura'),
  content = replace(content, 'EduNexus', 'EzyAura')
WHERE tenant_id IS NULL AND (heading LIKE '%EduNexus%' OR content LIKE '%EduNexus%');

UPDATE permissions SET description = replace(description, 'EduNexus', 'EzyAura')
WHERE description LIKE '%EduNexus%';

UPDATE tenants SET name = 'EzyAura Platform', updated_at = NOW()
WHERE slug = 'edunexus-platform' AND name = 'EduNexus Platform';
