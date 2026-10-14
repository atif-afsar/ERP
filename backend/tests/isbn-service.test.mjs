import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeIsbn,
  validateIsbn10Checksum,
  validateIsbn13Checksum,
  validateAndNormalizeIsbn,
} from '../src/services/isbnService.ts';

test('DEF-LIB-005 ISBN Reusable Service Unit Tests', async t => {
  await t.test('Null, undefined, empty, and whitespace-only values represent no ISBN', () => {
    assert.deepEqual(validateAndNormalizeIsbn(null), { isValid: true, normalized: null });
    assert.deepEqual(validateAndNormalizeIsbn(undefined), { isValid: true, normalized: null });
    assert.deepEqual(validateAndNormalizeIsbn(''), { isValid: true, normalized: null });
    assert.deepEqual(validateAndNormalizeIsbn('   '), { isValid: true, normalized: null });
    assert.deepEqual(validateAndNormalizeIsbn('\t\n  '), { isValid: true, normalized: null });

    assert.equal(normalizeIsbn(null), null);
    assert.equal(normalizeIsbn(undefined), null);
    assert.equal(normalizeIsbn(''), null);
    assert.equal(normalizeIsbn('   '), null);
  });

  await t.test('Valid ISBN-10 values with hyphen, unhyphenated, and uppercase/lowercase X', () => {
    // 0-306-40615-2
    const res1 = validateAndNormalizeIsbn('0-306-40615-2');
    assert.equal(res1.isValid, true);
    assert.equal(res1.normalized, '0306406152');

    // 0306406152
    const res2 = validateAndNormalizeIsbn('0306406152');
    assert.equal(res2.isValid, true);
    assert.equal(res2.normalized, '0306406152');

    // 0-8044-2957-X (uppercase X)
    const res3 = validateAndNormalizeIsbn('0-8044-2957-X');
    assert.equal(res3.isValid, true);
    assert.equal(res3.normalized, '080442957X');

    // 0-8044-2957-x (lowercase x normalized to uppercase X)
    const res4 = validateAndNormalizeIsbn('0-8044-2957-x');
    assert.equal(res4.isValid, true);
    assert.equal(res4.normalized, '080442957X');

    // Space-separated ISBN-10
    const res5 = validateAndNormalizeIsbn('0 8044 2957 X');
    assert.equal(res5.isValid, true);
    assert.equal(res5.normalized, '080442957X');
  });

  await t.test('Valid ISBN-13 values with hyphens, unhyphenated, and spaces', () => {
    // 978-0-306-40615-7
    const res1 = validateAndNormalizeIsbn('978-0-306-40615-7');
    assert.equal(res1.isValid, true);
    assert.equal(res1.normalized, '9780306406157');

    // 9780306406157
    const res2 = validateAndNormalizeIsbn('9780306406157');
    assert.equal(res2.isValid, true);
    assert.equal(res2.normalized, '9780306406157');

    // Space-separated 978 0 306 40615 7
    const res3 = validateAndNormalizeIsbn('978 0 306 40615 7');
    assert.equal(res3.isValid, true);
    assert.equal(res3.normalized, '9780306406157');

    // With surrounding whitespace
    const res4 = validateAndNormalizeIsbn('  978-0-306-40615-7  ');
    assert.equal(res4.isValid, true);
    assert.equal(res4.normalized, '9780306406157');
  });

  await t.test('Invalid ISBN-10 checksum is rejected', () => {
    const res1 = validateAndNormalizeIsbn('0-306-40615-3'); // Checksum 3 instead of 2
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /checksum/i);

    const res2 = validateAndNormalizeIsbn('0306406153');
    assert.equal(res2.isValid, false);

    const res3 = validateAndNormalizeIsbn('0-8044-2957-5'); // Checksum 5 instead of X
    assert.equal(res3.isValid, false);
  });

  await t.test('Invalid ISBN-13 checksum is rejected', () => {
    const res1 = validateAndNormalizeIsbn('978-0-306-40615-8'); // Checksum 8 instead of 7
    assert.equal(res1.isValid, false);
    assert.match(res1.error, /checksum/i);

    const res2 = validateAndNormalizeIsbn('9780306406158');
    assert.equal(res2.isValid, false);
  });

  await t.test('Too short and too long inputs are rejected', () => {
    assert.equal(validateAndNormalizeIsbn('123').isValid, false);
    assert.equal(validateAndNormalizeIsbn('0-306-4061').isValid, false); // 8 chars
    assert.equal(validateAndNormalizeIsbn('97803064061').isValid, false); // 11 chars
    assert.equal(validateAndNormalizeIsbn('978030640615').isValid, false); // 12 chars
    assert.equal(validateAndNormalizeIsbn('978-0-306-40615-71').isValid, false); // 14 chars
  });

  await t.test('Letters in ISBN-13 are rejected', () => {
    const res1 = validateAndNormalizeIsbn('978-0-306-40615-X');
    assert.equal(res1.isValid, false);

    const res2 = validateAndNormalizeIsbn('978-0-306-4061A-7');
    assert.equal(res2.isValid, false);
  });

  await t.test('X in non-final ISBN-10 position is rejected', () => {
    const res1 = validateAndNormalizeIsbn('0-30X-40615-2');
    assert.equal(res1.isValid, false);

    const res2 = validateAndNormalizeIsbn('X030640615');
    assert.equal(res2.isValid, false);
  });

  await t.test('Punctuation other than accepted spaces and hyphens is rejected', () => {
    assert.equal(validateAndNormalizeIsbn('978.0.306.40615.7').isValid, false);
    assert.equal(validateAndNormalizeIsbn('0_306_40615_2').isValid, false);
    assert.equal(validateAndNormalizeIsbn('0/306/40615/2').isValid, false);
    assert.equal(validateAndNormalizeIsbn('978#0306406157').isValid, false);
  });

  await t.test('Arbitrary text is rejected', () => {
    assert.equal(validateAndNormalizeIsbn('NotAnISBN').isValid, false);
    assert.equal(validateAndNormalizeIsbn('random-string-here').isValid, false);
    assert.equal(validateAndNormalizeIsbn('abcdefghij').isValid, false);
  });

  await t.test('Checksum helper functions independently verify valid & invalid inputs', () => {
    assert.equal(validateIsbn10Checksum('0306406152'), true);
    assert.equal(validateIsbn10Checksum('080442957X'), true);
    assert.equal(validateIsbn10Checksum('0306406153'), false);
    assert.equal(validateIsbn10Checksum('1234567890'), false);

    assert.equal(validateIsbn13Checksum('9780306406157'), true);
    assert.equal(validateIsbn13Checksum('9780306406158'), false);
    assert.equal(validateIsbn13Checksum('9781234567890'), false);
  });
});
