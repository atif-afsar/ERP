import { createRequire } from 'node:module';
const require = createRequire('c:/Users/asus/Desktop/ERP/package.json');
const pg = require('pg');
import fs from 'node:fs';

const state = JSON.parse(fs.readFileSync('c:/Users/asus/Desktop/ERP/qa/artifacts/rc/rc-state.json', 'utf8'));
const client = new pg.Client({ connectionString: `postgresql://postgres:postgres@127.0.0.1:5432/${state.database}` });

async function run() {
  try {
    await client.connect();
    const tId = 'c61631ce-c84c-4dff-a836-6b0a46a79c57';

    // Check table columns for classes
    const classCols = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'classes' ORDER BY ordinal_position`);
    console.log('classes columns:', classCols.rows);

    // Check classes rows
    const classes = await client.query(`SELECT * FROM classes WHERE tenant_id = $1`, [tId]);
    console.log('\nClasses in Springfield:', classes.rows);

    // Check sections rows
    const sections = await client.query(`SELECT * FROM sections WHERE tenant_id = $1`, [tId]);
    console.log('\nSections in Springfield:', sections.rows);

    // Check academic years
    const years = await client.query(`SELECT * FROM academic_years WHERE tenant_id = $1`, [tId]);
    console.log('\nAcademic Years in Springfield:', years.rows.map(y => ({ id: y.id, name: y.name, is_current: y.is_current, status: y.status })));

    // Total counts
    const sCount = await client.query(`SELECT count(*)::int as c FROM students WHERE tenant_id = $1`, [tId]);
    const eCount = await client.query(`SELECT count(*)::int as c FROM enrollments WHERE tenant_id = $1`, [tId]);
    const pCount = await client.query(`SELECT count(*)::int as c FROM parents WHERE tenant_id = $1`, [tId]);
    const psCount = await client.query(`SELECT count(*)::int as c FROM parent_students WHERE tenant_id = $1`, [tId]);
    const dCount = await client.query(`SELECT count(*)::int as c FROM student_documents WHERE tenant_id = $1`, [tId]);
    console.log('\nCounts in Springfield:', {
      students: sCount.rows[0].c,
      enrollments: eCount.rows[0].c,
      parents: pCount.rows[0].c,
      parentStudents: psCount.rows[0].c,
      documents: dCount.rows[0].c
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
