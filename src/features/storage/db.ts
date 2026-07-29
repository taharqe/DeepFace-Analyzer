import * as SQLite from 'expo-sqlite';

import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './schema';

/**
 * Connection ownership and the migration runner.
 *
 * Nothing in this file knows what the tables mean; nothing outside
 * `repository.ts` should need to touch it.
 */

/**
 * [E] File name for the database. Chosen, not measured. Keep it stable - the
 *     file IS the user's history, and renaming it silently orphans every
 *     answer and every scan a person has already given the app.
 */
export const DATABASE_NAME = 'aura.db';

/**
 * The single shared connection, as a promise.
 *
 * The promise - not the resolved database - is what is cached, so that N
 * callers racing on a cold start all await the SAME open. Caching the
 * database after opening would let two callers both see `null` and open two
 * connections, which on SQLite means two write paths onto one file.
 */
let connection: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Serialises every statement this module issues.
 *
 * `withTransactionAsync` on expo-sqlite is explicitly documented as NOT
 * exclusive: another query can interleave inside it. The exclusive variant
 * exists but is unsupported on web, which this project builds for
 * (`expo start --web`). Since there is exactly one connection, an interleaved
 * read can otherwise observe a multi-statement write halfway through - e.g.
 * `setConcerns` after its DELETE and before its INSERTs, which reads as "the
 * user has no concerns".
 *
 * A promise chain closes that hole without a dependency and without platform
 * branching. Every query is a handful of rows on a local file, so the cost of
 * giving up concurrency here is not measurable.
 *
 * The chain never rejects; a failed task settles it and the next task runs.
 */
let queue: Promise<unknown> = Promise.resolve();

/**
 * Open (once) and migrate the database.
 *
 * Safe to call before anything is initialised and safe to call concurrently -
 * that is the point. A failed open is not cached, so a transient failure can
 * be retried by simply calling again.
 */
export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (connection === null) {
    connection = openAndMigrate().catch((error: unknown) => {
      connection = null;
      throw error;
    });
  }
  return connection;
}

/**
 * Run `task` against the shared connection with every other storage statement
 * held off until it settles.
 *
 * MUST NOT be nested: a task that calls `withDatabase` again waits on a queue
 * entry that cannot advance until it returns. Repository functions therefore
 * never call one another.
 */
export function withDatabase<T>(
  task: (db: SQLite.SQLiteDatabase) => Promise<T>
): Promise<T> {
  const run = queue.then(async () => task(await getDatabase()));
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/**
 * Close the connection and drop the handle. The next call reopens.
 *
 * Provided for teardown and for a "delete my data" flow that needs the file
 * released; ordinary app code should never need it.
 */
export async function closeDatabase(): Promise<void> {
  const pending = connection;
  connection = null;
  if (pending === null) return;
  // An open that already failed has nothing to close.
  const db = await pending.catch(() => null);
  await db?.closeAsync();
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // [E] WAL: readers do not block the writer, which is what keeps a scan
  //     write off the critical path of a screen that is reading history.
  //     Wrapped because the web backend does not necessarily honour it, and
  //     failing to open the whole database over a performance pragma would be
  //     a poor trade.
  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  } catch {
    // Fall back to whatever journal mode the platform gives us.
  }

  await migrate(db);
  return db;
}

/**
 * Apply every migration newer than the database's `user_version`, in order,
 * each inside a transaction, and return the version arrived at.
 *
 * `user_version` is stored in the database header and participates in the
 * transaction, so a migration that throws leaves both the schema and the
 * version untouched - the app restarts on the old schema rather than on half
 * a new one.
 *
 * Exported for tests and for `SQLiteProvider`'s `onInit`, should a screen
 * layer ever prefer that. It is idempotent.
 */
export async function migrate(db: SQLite.SQLiteDatabase): Promise<number> {
  assertMigrationsWellFormed();

  const row = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const current = row?.user_version ?? 0;

  if (current > LATEST_SCHEMA_VERSION) {
    // Downgrade. Guessing at a rollback would risk destroying rows this build
    // cannot even see, so refuse loudly instead.
    throw new Error(
      `[storage] Database is at schema v${current}, newer than this build (v${LATEST_SCHEMA_VERSION}). Refusing to open.`
    );
  }

  const pending = [...MIGRATIONS]
    .sort((a, b) => a.version - b.version)
    .filter((m) => m.version > current);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.sql);
      // PRAGMA does not accept bound parameters. `assertMigrationsWellFormed`
      // has already established that this is a positive integer.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return LATEST_SCHEMA_VERSION;
}

/**
 * Cheap structural check on the migration list. A duplicated or skipped
 * version silently corrupts the upgrade path of every future install, and the
 * mistake is invisible at the call site, so it is checked rather than trusted.
 */
function assertMigrationsWellFormed(): void {
  const versions = MIGRATIONS.map((m) => m.version).sort((a, b) => a - b);

  versions.forEach((version, index) => {
    if (!Number.isInteger(version) || version !== index + 1) {
      throw new Error(
        `[storage] Migration versions must be unique, contiguous integers starting at 1. Got: ${versions.join(', ')}`
      );
    }
  });
}
