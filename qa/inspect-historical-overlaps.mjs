import fs from 'node:fs';
import dotenv from 'dotenv';
import pg from 'pg';

const env = dotenv.parse(fs.readFileSync('backend/.env'));
const state = JSON.parse(fs.readFileSync('qa/artifacts/rc/rc-state.json'));
const url = new URL(env.DATABASE_URL);
url.pathname = '/' + state.database;

const db = new pg.Client({ connectionString: url.href });
await db.connect();

const overlaps = await db.query(`
  SELECT 
    a.id as a_id, a.tenant_id, a.academic_year_id, a.day_of_week, 
    a.start_time as a_start, a.end_time as a_end, a.room as a_room, 
    a.teacher_id as a_teacher, a.section_id as a_section, a.class_id as a_class, a.subject_id as a_subject,
    b.id as b_id, b.start_time as b_start, b.end_time as b_end, b.room as b_room,
    b.teacher_id as b_teacher, b.section_id as b_section, b.class_id as b_class, b.subject_id as b_subject,
    CASE 
      WHEN a.teacher_id = b.teacher_id AND a.section_id = b.section_id THEN 'SAME_TEACHER_AND_SECTION'
      WHEN a.teacher_id = b.teacher_id THEN 'SAME_TEACHER'
      WHEN a.section_id = b.section_id THEN 'SAME_SECTION'
      WHEN NULLIF(lower(btrim(a.room)), '') = NULLIF(lower(btrim(b.room)), '') THEN 'SAME_ROOM'
      ELSE 'UNKNOWN'
    END as conflict_type
  FROM timetable_entries a
  JOIN timetable_entries b ON a.id < b.id 
    AND a.tenant_id = b.tenant_id 
    AND a.academic_year_id = b.academic_year_id 
    AND a.day_of_week = b.day_of_week 
    AND a.start_time < b.end_time 
    AND a.end_time > b.start_time
  WHERE a.teacher_id = b.teacher_id 
     OR a.section_id = b.section_id 
     OR NULLIF(lower(btrim(a.room)), '') = NULLIF(lower(btrim(b.room)), '')
`);

const detailedPairs = [];

for (const row of overlaps.rows) {
  const [sA, sB, tA, tB, cA, cB, subA, subB, ay] = await Promise.all([
    db.query('SELECT name FROM sections WHERE id=$1', [row.a_section]),
    db.query('SELECT name FROM sections WHERE id=$1', [row.b_section]),
    db.query('SELECT name, employee_id FROM staff WHERE id=$1', [row.a_teacher]),
    db.query('SELECT name, employee_id FROM staff WHERE id=$1', [row.b_teacher]),
    db.query('SELECT name FROM classes WHERE id=$1', [row.a_class]),
    db.query('SELECT name FROM classes WHERE id=$1', [row.b_class]),
    db.query('SELECT name, code FROM subjects WHERE id=$1', [row.a_subject]),
    db.query('SELECT name, code FROM subjects WHERE id=$1', [row.b_subject]),
    db.query('SELECT name FROM academic_years WHERE id=$1', [row.academic_year_id]),
  ]);

  const pairInfo = {
    pairId: `${row.a_id} <-> ${row.b_id}`,
    conflictType: row.conflict_type,
    dayOfWeek: row.day_of_week,
    academicYear: ay.rows[0]?.name || row.academic_year_id,
    entryA: {
      id: row.a_id,
      time: `${row.a_start} - ${row.a_end}`,
      room: row.a_room,
      teacher: tA.rows[0]?.name ? `${tA.rows[0].name} (${tA.rows[0].employee_id})` : row.a_teacher,
      class: cA.rows[0]?.name || row.a_class,
      section: sA.rows[0]?.name || row.a_section,
      subject: subA.rows[0]?.name ? `${subA.rows[0].name} (${subA.rows[0].code})` : row.a_subject,
    },
    entryB: {
      id: row.b_id,
      time: `${row.b_start} - ${row.b_end}`,
      room: row.b_room,
      teacher: tB.rows[0]?.name ? `${tB.rows[0].name} (${tB.rows[0].employee_id})` : row.b_teacher,
      class: cB.rows[0]?.name || row.b_class,
      section: sB.rows[0]?.name || row.b_section,
      subject: subB.rows[0]?.name ? `${subB.rows[0].name} (${subB.rows[0].code})` : row.b_subject,
    }
  };
  detailedPairs.push(pairInfo);
}

console.log('Total overlap pairs:', detailedPairs.length);
console.log(JSON.stringify(detailedPairs, null, 2));

await db.end();
