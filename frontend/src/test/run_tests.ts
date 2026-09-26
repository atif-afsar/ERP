import { runAuthRbacVerificationSuite } from './auth_rbac_verification';

async function main() {
  console.log('====================================================');
  console.log('  PHASE 2: AUTHENTICATION & RBAC ACCEPTANCE TESTS   ');
  console.log('====================================================');

  const { passed, results } = await runAuthRbacVerificationSuite();

  results.forEach((r, idx) => {
    const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${statusIcon}] ${r.testName}`);
    console.log(`         ${r.details}`);
  });

  console.log('====================================================');
  if (passed) {
    console.log('RESULT: ALL 8 ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('RESULT: SOME ACCEPTANCE TESTS FAILED!');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
