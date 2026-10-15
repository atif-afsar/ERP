import { reconcileLegacyIsbns } from './lib/isbn_v1.mjs';

/**
 * Phase 11C: DEF-LIB-005 Migration Determinism & Immutable Helper Binding
 * 
 * Reconciles and guarantees deterministic ISBN classification across:
 * - existing installations where migration 0028 is already applied;
 * - fresh installations where runtime isbnService.ts may have mutated;
 * - future application releases.
 * 
 * Uses the frozen, immutable ISBN v1 helper: lib/isbn_v1.mjs.
 */
export async function up(client) {
  const summary = await reconcileLegacyIsbns(client);
  console.log(`[native_0029_library_isbn_migration_determinism] Inspected: ${summary.totalInspected}, Unique: ${summary.validUnique}, Collisions: ${summary.validCollisions}, Invalid: ${summary.invalid}, Updated: ${summary.updatedRows}`);
}
