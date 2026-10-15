import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import ts from 'typescript';

const root = fileURLToPath(new URL('./', import.meta.url));
dotenv.config({ path: path.join(root, '.env') });
const directory = path.join(root, 'sql/migrations');
const canonicalMigrationRoot = fsSync.realpathSync(directory);

const names = (await fs.readdir(directory)).filter(name => /^native_\d{4}_[a-z0-9_]+\.(sql|mjs|js)$/.test(name)).sort();
const sources = [{ name: 'native_0001_baseline.sql', file: path.join(root, 'sql/001_schema.sql') },
  ...names.map(name => ({ name, file: path.join(directory, name) }))];

const APPROVED_NODE_BUILTINS = new Set([
  'node:path',
  'node:crypto',
  'node:fs',
  'node:fs/promises',
  'node:url',
  'node:util',
  'node:os',
  'node:buffer',
  'node:stream',
  'node:events',
]);

const ALLOWED_DEP_EXTENSIONS = new Set(['.mjs', '.js', '.json']);

/**
 * Strict AST-based import parser using TypeScript compiler API.
 * Detects static imports, export-from, and dynamic imports.
 * Rejects non-literal dynamic imports, CommonJS require, and unsupported syntax.
 * Completely ignores comments, string contents, and template strings.
 */
function parseImports(filePath, code) {
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS
  );

  const imports = [];

  function visit(node) {
    // 1. Static import declaration: import ... from '...' or import '...'
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (!ts.isStringLiteral(moduleSpecifier)) {
        throw new Error(`Non-literal module specifier in static import in ${filePath}`);
      }
      imports.push({ specifier: moduleSpecifier.text, type: 'static' });
      return;
    }

    // 2. Static export-from declaration: export ... from '...'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      if (!ts.isStringLiteral(node.moduleSpecifier)) {
        throw new Error(`Non-literal module specifier in export declaration in ${filePath}`);
      }
      imports.push({ specifier: node.moduleSpecifier.text, type: 'export_from' });
      return;
    }

    // 3. Dynamic import(...): ts.isCallExpression where expression is ImportKeyword
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const args = node.arguments;
      if (!args || args.length === 0) {
        throw new Error(`Dynamic import() requires a specifier argument in ${filePath}`);
      }
      const firstArg = args[0];
      if (!ts.isStringLiteral(firstArg)) {
        throw new Error(`Non-literal dynamic import rejected in ${filePath}: import argument must be a string literal`);
      }
      imports.push({ specifier: firstArg.text, type: 'dynamic' });
      return;
    }

    // 4. import equals declaration: import x = require(...) -> reject
    if (ts.isImportEqualsDeclaration(node)) {
      throw new Error(`Unsupported import-equals declaration in ${filePath}`);
    }

    // 5. CommonJS require() call -> reject
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') {
      throw new Error(`CommonJS require() call rejected in ${filePath}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

/**
 * Deterministic, recursive, realpath-safe migration checksum computation.
 * Resolves local dependencies recursively, detects cycles, enforces canonical
 * realpath containment within the migration root directory, and hashes dependencies
 * sorted by normalized forward-slash relative path.
 */
async function computeMigrationChecksum(name, file, content) {
  const hasher = createHash('sha256').update(content);

  if (name.endsWith('.mjs') || name.endsWith('.js')) {
    const fileReal = fsSync.realpathSync(file);
    const visited = new Map(); // canonicalRealPath -> { normalizedRel, bytes }
    const activeStack = new Set([fileReal]); // active recursion stack for cycle detection

    async function resolveDependencies(currentReal, currentContent) {
      const rawImports = parseImports(currentReal, currentContent);

      for (const { specifier } of rawImports) {
        // 1. Approved Node built-in
        if (APPROVED_NODE_BUILTINS.has(specifier)) {
          continue;
        }

        // 2. Unapproved Node built-in
        if (specifier.startsWith('node:')) {
          throw new Error(`Unapproved Node built-in import '${specifier}' in ${currentReal}`);
        }

        // 3. Absolute path
        if (path.isAbsolute(specifier) || specifier.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(specifier)) {
          throw new Error(`Absolute path imports are forbidden: '${specifier}' in ${currentReal}`);
        }

        // 4. URL imports
        if (specifier.startsWith('file:') || specifier.startsWith('http:') || specifier.startsWith('https:')) {
          throw new Error(`URL imports are forbidden: '${specifier}' in ${currentReal}`);
        }

        // 5. Must be a relative path
        if (!specifier.startsWith('.')) {
          throw new Error(`Bare third-party imports are forbidden: '${specifier}' in ${currentReal}`);
        }

        // 6. Lexical resolution and containment check
        const candidateLexical = path.resolve(path.dirname(currentReal), specifier);
        const relLexical = path.relative(directory, candidateLexical);
        if (relLexical.startsWith('..') || path.isAbsolute(relLexical)) {
          throw new Error(`Path safety violation in migration ${name}: import '${specifier}' in ${currentReal} lexically escapes migration directory`);
        }

        // 7. Extension check
        const ext = path.extname(specifier).toLowerCase();
        if (!ALLOWED_DEP_EXTENSIONS.has(ext)) {
          throw new Error(`Unsupported dependency extension '${ext}' for '${specifier}' in ${currentReal}`);
        }

        // 8. File existence check
        if (!fsSync.existsSync(candidateLexical)) {
          throw new Error(`Missing dependency file: '${specifier}' imported from ${currentReal}`);
        }

        // 9. Realpath canonical resolution
        let depReal;
        try {
          depReal = fsSync.realpathSync(candidateLexical);
        } catch (err) {
          throw new Error(`Failed to resolve realpath for '${candidateLexical}': ${err.message}`);
        }

        // 10. Canonical realpath containment check (separator-aware)
        const normDepReal = path.normalize(depReal);
        const normMigrationRoot = path.normalize(canonicalMigrationRoot);
        const isContained = normDepReal.startsWith(normMigrationRoot + path.sep) ||
                            normDepReal.startsWith(normMigrationRoot + '/');
        if (!isContained) {
          throw new Error(`Path containment violation: import '${specifier}' in ${currentReal} resolves outside migration root (${depReal})`);
        }

        // 11. Cycle detection
        if (activeStack.has(depReal)) {
          const chain = [...activeStack, depReal]
            .map(p => path.relative(canonicalMigrationRoot, p).replace(/\\/g, '/'))
            .join(' -> ');
          throw new Error(`Circular dependency detected: ${chain}`);
        }

        // 12. Skip if already visited and validated
        if (visited.has(depReal)) {
          continue;
        }

        // 13. Read dependency content
        const depBytes = await fs.readFile(depReal);
        const depContent = depBytes.toString('utf8');

        // Deterministic JSON validation if .json
        if (ext === '.json') {
          try {
            JSON.parse(depContent);
          } catch (e) {
            throw new Error(`Invalid JSON in migration dependency ${depReal}: ${e.message}`);
          }
        }

        // 14. Recurse for nested dependencies
        activeStack.add(depReal);
        if (ext === '.mjs' || ext === '.js') {
          await resolveDependencies(depReal, depContent);
        }
        activeStack.delete(depReal);

        const normalizedRel = path.relative(canonicalMigrationRoot, depReal).replace(/\\/g, '/');
        visited.set(depReal, {
          normalizedRel,
          bytes: depBytes,
        });
      }
    }

    await resolveDependencies(fileReal, content);

    // Sort dependencies deterministically by normalized migration-root-relative path
    const sortedDeps = [...visited.values()].sort((a, b) => a.normalizedRel.localeCompare(b.normalizedRel));
    for (const dep of sortedDeps) {
      hasher.update(`\n--- DEP: ${dep.normalizedRel} ---\n`).update(dep.bytes);
    }
  }

  return hasher.digest('hex');
}

const HISTORICAL_TRANSITIONS = new Map([
  [
    'native_0028_library_isbn_legacy_backfill.mjs',
    {
      approvedCurrentChecksum: 'ed20a976632706581f8293ce6f22f6dffa5ebc92256ce2c9dca99046f544ae12',
      acceptedHistoricalChecksums: new Set([
        '3cc2a0a5c2529ca45df945a39fd773f0225bd8c21ef09fe3148f36835de6600a'
      ])
    }
  ],
  [
    'native_0029_library_isbn_migration_determinism.mjs',
    {
      approvedCurrentChecksum: 'e4d385ce11837f359c41fc7d6bfda964d0e294cf9bb94e98667ca36a598aa285',
      acceptedHistoricalChecksums: new Set([
        'ba8a247750b73a72678d38d91ba865f236852d9927528a39fbf7a01fbc086974'
      ])
    }
  ]
]);

async function runCli() {
  const migrations = await Promise.all(sources.map(async ({ name, file }) => {
    const content = await fs.readFile(file, 'utf8');
    const checksum = await computeMigrationChecksum(name, file, content);
    return { name, file, sql: content, content, checksum };
  }));
  if (!migrations.length) throw new Error('No native migrations found.');
  const command = process.argv[2] || 'status';
  if (!['plan', 'status', 'up', 'baseline'].includes(command)) throw new Error('Use plan, status, up or baseline.');
  if (command === 'plan') {
    console.log(migrations.map(item => `${item.name} ${item.checksum}`).join('\n'));
    process.exit(0);
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  let locked = false;
  try {
    await client.connect();
    await client.query("SELECT pg_advisory_lock(hashtext('edunexus_native_migrations'))");
    locked = true;
    const historyExists = (await client.query("SELECT to_regclass('public.schema_migrations') AS name")).rows[0].name;
    const applied = historyExists ? (await client.query('SELECT name, checksum FROM public.schema_migrations ORDER BY name')).rows : [];
    for (const item of applied) {
      const source = migrations.find(migration => migration.name === item.name);
      if (!source) throw new Error(`Migration missing from disk: ${item.name}`);
      if (source.checksum === item.checksum) {
        continue;
      }
      const transition = HISTORICAL_TRANSITIONS.get(item.name);
      const isValidTransition = transition &&
        transition.acceptedHistoricalChecksums.has(item.checksum) &&
        source.checksum === transition.approvedCurrentChecksum;
      if (!isValidTransition) {
        throw new Error(`Migration history/checksum mismatch: ${item.name} (stored: ${item.checksum}, current: ${source.checksum})`);
      }
    }
    const pending = migrations.filter(migration => !applied.some(item => item.name === migration.name));
    if (command === 'status') {
      console.log(migrations.map(item => `${applied.some(row => row.name === item.name) ? 'APPLIED' : 'PENDING'} ${item.name}`).join('\n'));
    } else if (command === 'baseline') {
      if (!process.argv.includes('--confirm-native-schema')) throw new Error('Baseline requires --confirm-native-schema after a backup and manual native-schema review.');
      if (applied.length) throw new Error('Migration history already exists.');
      const existing = (await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'")).rows;
      const baseline = migrations[0];
      const definitions = [...baseline.sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \(([\s\S]*?)\n\);/g)];
      const missing = [];
      for (const [, table, body] of definitions) for (const line of body.split('\n')) {
        const match = /^\s+(\w+)\s+(?:UUID|VARCHAR|TEXT|JSONB|BOOLEAN|INT|NUMERIC|DATE|TIME|TIMESTAMPTZ)\b/i.exec(line);
        if (match && !existing.some(column => column.table_name === table && column.column_name === match[1])) missing.push(`${table}.${match[1]}`);
      }
      if (missing.length) throw new Error(`Database is not the native baseline; missing: ${missing.join(', ')}`);
      await client.query('BEGIN');
      try {
        await client.query('CREATE TABLE public.schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
        await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [baseline.name, baseline.checksum]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      console.log('Recorded native baseline. Run db:migrate for pending migrations.');
    } else {
      const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name <> 'schema_migrations'")).rows;
      if (!applied.length && tables.length) throw new Error('Existing schema detected. Back up, review, then run db:baseline -- --confirm-native-schema.');
      for (const migration of pending) {
        await client.query('BEGIN');
        try {
          await client.query('CREATE TABLE IF NOT EXISTS public.schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
          if (migration.name.endsWith('.sql')) {
            await client.query(migration.content);
          } else {
            const mod = await import(pathToFileURL(migration.file).href);
            if (typeof mod.up !== 'function') throw new Error(`Migration ${migration.name} must export an async up(client) function.`);
            await mod.up(client);
          }
          await client.query('INSERT INTO public.schema_migrations (name, checksum) VALUES ($1, $2)', [migration.name, migration.checksum]);
          await client.query('COMMIT');
          console.log(`APPLIED ${migration.name}`);
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      }
    }
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock(hashtext('edunexus_native_migrations'))").catch(() => {});
    await client.end();
  }
}

const isMain = process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (isMain) {
  await runCli();
}

export {
  computeMigrationChecksum,
  parseImports,
  runCli,
  HISTORICAL_TRANSITIONS,
  APPROVED_NODE_BUILTINS,
  ALLOWED_DEP_EXTENSIONS,
  canonicalMigrationRoot,
  directory as migrationDirectory,
};
