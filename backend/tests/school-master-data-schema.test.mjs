import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../sql/migrations/native_0004_school_master_data.sql', import.meta.url), 'utf8');
const isolation = await readFile(new URL('../sql/migrations/native_0005_section_teacher_isolation.sql', import.meta.url), 'utf8');

test('Phase 3 migration creates branch and teacher assignment foundations', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS branches/i);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS teacher_subject_assignments/i);
  assert.match(migration, /uq_branches_one_main/i);
  assert.match(migration, /uq_academic_years_one_current/i);
  assert.match(migration, /uq_teacher_subject_scope/i);
});

test('Phase 3 relations use composite tenant foreign keys', () => {
  for (const relation of ['branch_id,tenant_id', 'academic_year_id,tenant_id', 'class_id,tenant_id', 'teacher_id,tenant_id', 'subject_id,tenant_id']) {
    assert.ok(migration.replaceAll(' ', '').includes(`FOREIGNKEY(${relation})`), `missing tenant relation ${relation}`);
  }
  assert.match(isolation.replaceAll(' ', ''), /FOREIGNKEY\(class_teacher_id,tenant_id\)/i);
});

test('Phase 3 permissions stay within school master data scope', () => {
  assert.ok(migration.includes("'master_data.view'"));
  assert.ok(migration.includes("'master_data.manage'"));
  for (const excluded of ['students.create','fees.create','attendance.mark','exams.create','payments.create']) {
    assert.equal(migration.includes(`'${excluded}'`), false);
  }
});
