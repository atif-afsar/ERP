import fs from 'node:fs';
import path from 'node:path';

const testDir = path.resolve('backend/tests');
const files = fs.readdirSync(testDir).filter(f => f.endsWith('.test.mjs'));

console.log(`Found ${files.length} test files in ${testDir}:\n`);

const results = [];

for (const file of files) {
  const fullPath = path.join(testDir, file);
  const content = fs.readFileSync(fullPath, 'utf8');

  const imports = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('import ') || line.includes('require(')) {
      imports.push(line.trim());
    }
  }

  const hasPg = content.includes("'pg'") || content.includes('"pg"') || content.includes('DATABASE_URL') || content.includes('dbPool') || content.includes('query(');
  const hasApp = content.includes('../src/server') || content.includes('../src/app') || content.includes('supertest') || content.includes('fetch(');
  const hasSchema = content.includes('Schema') || content.includes('zod') || content.includes('.parse(') || content.includes('.safeParse(');
  const hasMiddleware = content.includes('authenticate') || content.includes('requireRole') || content.includes('requireTenant');

  let category = 'Unit/Schema';
  if (hasPg && hasApp) category = 'Database Integration / API';
  else if (hasPg) category = 'Database Direct';
  else if (hasApp) category = 'API / Integration';
  else if (hasMiddleware) category = 'Middleware / Security';
  else if (hasSchema) category = 'Unit / Schema Validation';

  // Count tests: test( or it(
  const testMatches = content.match(/(?:test|it)\s*\(/g) || [];

  results.push({
    file,
    category,
    hasPg,
    hasApp,
    hasSchema,
    testCount: testMatches.length,
    imports: imports.slice(0, 5)
  });
}

console.log(JSON.stringify(results, null, 2));
