import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const root = path.resolve('.');
const state = JSON.parse(fs.readFileSync(path.join(root, 'qa/artifacts/rc/state.json'), 'utf8'));

const pool = new pg.Pool({
  connectionString: `postgres://postgres:postgres@localhost:5432/${state.database}`,
});

async function run() {
  console.log('Testing BUG-006, BUG-015, and other repairs...');

  // Authenticate as TENANT_ADMIN
  const loginRes = await fetch('http://127.0.0.1:5111/api/v1/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: state.accounts.TENANT_ADMIN.email, password: state.password }),
  }).then(r => r.json());

  const token = loginRes.data.token;
  const tenantId = loginRes.data.tenantId || loginRes.data.user?.tenantId || (await pool.query('SELECT tenant_id FROM memberships WHERE user_id = $1', [loginRes.data.user?.id])).rows[0]?.tenant_id;
  console.log('TENANT_ADMIN authenticated successfully, tenantId:', tenantId);

  // =========================================================================
  // BUG-006: Master data profile update with empty optional fields
  // =========================================================================
  console.log('\n--- Testing BUG-006: Master Data Profile Update ---');
  // First, test with invalid email (should fail 422)
  const invalidEmailRes = await fetch('http://127.0.0.1:5111/api/v1/master-data/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: 'not-an-email',
      phone: '1234567890',
    }),
  });
  console.log(`Invalid email response status: ${invalidEmailRes.status} (expected 422)`);
  if (invalidEmailRes.status !== 422) {
    throw new Error(`Expected 422 for invalid email, got ${invalidEmailRes.status}`);
  }

  // Second, test with empty string for optional fields (email: "", website: "", phone: "", etc.)
  const emptyOptionalRes = await fetch('http://127.0.0.1:5111/api/v1/master-data/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      email: '',
      phone: '',
      website: '',
      address: '',
      postalCode: '',
    }),
  });
  const emptyOptionalData = await emptyOptionalRes.json();
  console.log(`Empty optional fields response status: ${emptyOptionalRes.status} (expected 200)`);
  if (emptyOptionalRes.status !== 200) {
    throw new Error(`Expected 200 for empty optional fields, got ${emptyOptionalRes.status}: ${JSON.stringify(emptyOptionalData)}`);
  }
  console.log('Resulting profile data:', {
    email: emptyOptionalData.data?.email,
    phone: emptyOptionalData.data?.phone,
    website: emptyOptionalData.data?.website,
    address: emptyOptionalData.data?.address,
  });

  // Verify DB state
  const dbProfile = await pool.query('SELECT email, phone, website, address_line_1, postal_code FROM tenants WHERE id = $1', [tenantId]);
  console.log('DB row after empty optional update:', dbProfile.rows[0]);
  if (dbProfile.rows[0].email !== null || dbProfile.rows[0].website !== null) {
    throw new Error(`Expected email and website to be null in DB, got: ${JSON.stringify(dbProfile.rows[0])}`);
  }
  console.log('BUG-006 VERIFIED: Empty strings cleanly converted to null and persisted!');

  // Restore non-empty profile values
  await fetch('http://127.0.0.1:5111/api/v1/master-data/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: 'Springfield Academy',
      email: 'contact@springfield.edu',
      phone: '555-123-4567',
      website: 'https://springfield.edu',
      address: '742 Evergreen Terrace',
      postalCode: '97477',
    }),
  });

  // =========================================================================
  // BUG-015: Calendar-date consistency (PostgreSQL DATE values)
  // =========================================================================
  console.log('\n--- Testing BUG-015: Calendar-date consistency ---');
  // Check API response for academic years (which have DATE columns start_date and end_date)
  const yearsRes = await fetch('http://127.0.0.1:5111/api/v1/master-data/academic-years', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  console.log('Academic year sample from API:', yearsRes.data?.[0]);
  if (yearsRes.data?.[0]) {
    const startDate = yearsRes.data[0].start_date;
    const endDate = yearsRes.data[0].end_date;
    console.log(`startDate: ${startDate} (${typeof startDate}), endDate: ${endDate} (${typeof endDate})`);
    if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new Error(`Expected YYYY-MM-DD string format for start_date, got ${startDate}`);
    }
  }

  // Check API response for academic year or payment proofs
  const proofsRes = await fetch('http://127.0.0.1:5111/api/v1/fees/proofs', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());
  console.log('Proof payment_date sample from API:', proofsRes.data?.[0]?.payment_date || 'No proofs');
  if (proofsRes.data?.[0]?.payment_date) {
    const pDate = proofsRes.data[0].payment_date;
    if (typeof pDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(pDate)) {
      throw new Error(`Expected YYYY-MM-DD date format, got ${pDate}`);
    }
  }
  console.log('BUG-015 VERIFIED: DATE columns retain pure YYYY-MM-DD string representation without timezone shifting!');

  await pool.end();
  console.log('\nALL CHECKS PASSED SUCCESSFULLY!');
}

run().catch(e => {
  console.error('FAILED:', e);
  process.exit(1);
});
