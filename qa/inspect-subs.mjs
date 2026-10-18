import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:postgres@127.0.0.1:5432/edunexus_erp' });
async function check() {
  const plans = await pool.query("SELECT id, code, name, price_amount, billing_period FROM subscription_plans");
  console.log('Plans:', plans.rows);
  const settings = await pool.query("SELECT * FROM platform_payment_settings");
  console.log('Settings:', settings.rows);
  await pool.end();
}
check();
