import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp' });
async function check() {
  const students = await pool.query("SELECT id, first_name, last_name, admission_no FROM students WHERE tenant_id = '00000000-0000-0000-0000-000000000001'");
  console.log('Students:', students.rows);
  const staff = await pool.query("SELECT id, name, email, employee_id FROM staff WHERE tenant_id = '00000000-0000-0000-0000-000000000001'");
  console.log('Staff:', staff.rows);
  await pool.end();
}
check();
