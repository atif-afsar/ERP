import { runMultiTenancyRlsVerificationSuite } from './multi_tenancy_rls_verification';

async function main() {
  console.log('================================================================');
  console.log('  PHASE 3: MULTI-TENANCY & ROW LEVEL SECURITY VERIFICATION      ');
  console.log('================================================================');

  const { passed, results } = await runMultiTenancyRlsVerificationSuite();

  results.forEach((r) => {
    const icon = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${icon}] ${r.testName}`);
    console.log(`         ${r.details}`);
  });

  console.log('================================================================');
  if (passed) {
    console.log('RESULT: ALL 11 PHASE 3 SECURITY TESTS PASSED PERFECTLY!');
  } else {
    console.error('RESULT: SOME SECURITY TESTS FAILED!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Phase 3 runner fatal error:', err);
  process.exit(1);
});
