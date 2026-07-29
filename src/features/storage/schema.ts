import type { Concern, RoutineSlot } from '../catalogue/types';
import { AGE_BANDS, type AgeBand } from '../onboarding/questions';

/**
 * Persistence schema: table shapes, the migration list, and the row <-> domain
 * mapping. Together with `repository.ts` this is the only place SQL is allowed
 * to exist.
 *
 * Provenance: nothing in the 50-capture corpus shows a database, so every
 * choice below is [E] - a proposal, marked at its definition with the reason
 * it was chosen. None of it is measured, and none of it should be presented as
 * if it were.
 */

/* -------------------------------------------------------------------------- */
/* Scores                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A 0-100 HEURISTIC score describing the appearance of skin in one scan.
 *
 * [E] The 0-100 range is a proposal. It matches the only other 0-100 quantity
 *     in the app (`Product.score`, the catalogue fit percentage) so the two
 *     read on the same scale, and it is what the Insights sparkline already
 *     plots.
 *
 * This is NOT a measurement, a diagnosis, or a clinical grade. It is whatever
 * number the scan pipeline computed from a photograph. Storage records it and
 * checks its range; storage makes no claim that it means anything about a
 * person's health, and neither should any caller or any user-facing string
 * derived from it.
 */
export type HeuristicScore = number;

/** [E] Inclusive bounds enforced by both TypeScript validation and SQL CHECKs. */
export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

/* -------------------------------------------------------------------------- */
/* Column naming                                                              */
/* -------------------------------------------------------------------------- */

/**
 * `Concern` id -> the column that holds that concern's heuristic score.
 *
 * The ids carry hyphens, which are legal in SQLite only when quoted, so each
 * one gets an explicit snake_case column instead. Typing the map as
 * `Record<Concern, string>` is deliberate: adding a seventh `Concern` fails to
 * compile HERE and in `concernScoresFromRow` below, which is the signal that a
 * new migration is required. It must never silently start writing to a column
 * that does not exist.
 */
export const CONCERN_COLUMNS = {
  'fine-lines': 'fine_lines',
  pores: 'pores',
  'uneven-tone': 'uneven_tone',
  dryness: 'dryness',
  redness: 'redness',
  dullness: 'dullness',
} as const satisfies Record<Concern, string>;

export type ConcernColumn = (typeof CONCERN_COLUMNS)[Concern];

/**
 * Stable column order for generated DML.
 *
 * The cast is sound: `CONCERN_COLUMNS` is an object literal typed as
 * `Record<Concern, string>`, so excess-property checking guarantees its keys
 * are exactly the members of `Concern`, and string keys enumerate in source
 * order.
 */
export const CONCERN_IDS = Object.keys(CONCERN_COLUMNS) as readonly Concern[];

/* -------------------------------------------------------------------------- */
/* Row shapes - exactly what SQLite hands back                                */
/* -------------------------------------------------------------------------- */

export interface ProfileRow {
  age_band: string;
  created_at: number;
}

export interface ConcernRow {
  concern: string;
}

export type ScanRow = {
  id: number;
  taken_at: number;
  overall: number;
  image_uri: string | null;
} & { [K in ConcernColumn]: number };

export interface RoutineItemRow {
  slot: string;
  step: string;
  product_id: string;
  ord: number;
}

/* -------------------------------------------------------------------------- */
/* Domain shapes - what the repository speaks                                 */
/* -------------------------------------------------------------------------- */

/**
 * The single stored profile row.
 *
 * [E] `createdAt` is epoch milliseconds (`Date.now()`). Milliseconds because
 *     that is what JavaScript hands you for free; an integer because SQLite
 *     has no date type and text timestamps sort correctly only by accident.
 */
export interface Profile {
  ageBand: AgeBand;
  createdAt: number;
}

/** The heuristic scores of one scan. See {@link HeuristicScore}. */
export interface ScanHeuristics {
  /**
   * [E] A single composite figure for the whole scan, for the hero number on
   *     Insights. Storage does not compute or check it against the per-concern
   *     scores - it records what the pipeline supplied.
   */
  overall: HeuristicScore;
  /** One score per concern the app tracks. */
  concerns: Record<Concern, HeuristicScore>;
}

/** Arguments to {@link insertScan}. */
export interface ScanInput extends ScanHeuristics {
  /** Epoch ms. Defaults to `Date.now()` at insert time. */
  takenAt?: number;
  /**
   * [E] Optional local file URI of the capture this scan came from.
   *     Nullable because a scan is meaningful without the photograph, and
   *     because the file may be deleted from disk while the row survives.
   *     Storage never reads or writes the file itself.
   */
  imageUri?: string | null;
}

/** A stored scan, as read back. */
export interface ScanRecord extends ScanHeuristics {
  id: number;
  /** Epoch ms. */
  takenAt: number;
  imageUri: string | null;
}

/** Arguments to {@link saveRoutine}. Order in the array becomes `ord`. */
export interface RoutineItemInput {
  /** Free text, e.g. `'Cleanse'` - matches `Product.step` in the catalogue. */
  step: string;
  /** `Product.id`. Not a foreign key: the catalogue is not in this database. */
  productId: string;
}

/** A stored routine item, as read back. */
export interface RoutineItem extends RoutineItemInput {
  slot: RoutineSlot;
  /** 0-based position within the slot. */
  ord: number;
}

/* -------------------------------------------------------------------------- */
/* Migrations                                                                 */
/* -------------------------------------------------------------------------- */

export interface Migration {
  /** 1-based, contiguous, unique. Written to `PRAGMA user_version`. */
  readonly version: number;
  /** Human note - why this migration exists. Never executed. */
  readonly description: string;
  /** One or more statements; the runner wraps them in a transaction. */
  readonly sql: string;
}

/**
 * FROZEN. This string is the shape of every database that has already run it.
 *
 * Editing it would give existing installs and fresh installs different schemas
 * for the same `user_version`, which is the one bug a migration runner exists
 * to prevent. It is written out literally rather than generated from
 * `CONCERN_COLUMNS` for exactly that reason: if a seventh concern is ever
 * added, this string must not quietly change underneath it. Add migration 2.
 *
 * Design notes:
 * - `profile` is pinned to a single row by `CHECK (id = 1)` rather than by
 *   convention, so a second row is impossible rather than merely unexpected.
 * - Scores are REAL, not INTEGER: the pipeline may produce fractional values,
 *   and rounding on the way in would discard precision the app never chose to
 *   discard. The CHECKs enforce the documented 0-100 range at the storage
 *   boundary as well as in TypeScript, because a bad score is worse than a
 *   failed write in a health-adjacent app.
 * - There is no CHECK enumerating concern ids or routine slots. Those are
 *   TypeScript unions that may grow; duplicating them in frozen SQL would turn
 *   every product decision into a migration. Ids are validated on read
 *   instead - see `isConcern`.
 * - `routine_items.product_id` is not a foreign key. The catalogue ships in
 *   the bundle (`features/catalogue/data.ts`), not in this database.
 */
const MIGRATION_1_SQL = `
CREATE TABLE IF NOT EXISTS profile (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  age_band   TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS concerns (
  concern TEXT    PRIMARY KEY NOT NULL,
  ord     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  taken_at    INTEGER NOT NULL,
  overall     REAL    NOT NULL CHECK (overall     BETWEEN 0 AND 100),
  fine_lines  REAL    NOT NULL CHECK (fine_lines  BETWEEN 0 AND 100),
  pores       REAL    NOT NULL CHECK (pores       BETWEEN 0 AND 100),
  uneven_tone REAL    NOT NULL CHECK (uneven_tone BETWEEN 0 AND 100),
  dryness     REAL    NOT NULL CHECK (dryness     BETWEEN 0 AND 100),
  redness     REAL    NOT NULL CHECK (redness     BETWEEN 0 AND 100),
  dullness    REAL    NOT NULL CHECK (dullness    BETWEEN 0 AND 100),
  image_uri   TEXT
);

CREATE INDEX IF NOT EXISTS scans_taken_at_idx ON scans (taken_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS routine_items (
  slot       TEXT    NOT NULL,
  ord        INTEGER NOT NULL,
  step       TEXT    NOT NULL,
  product_id TEXT    NOT NULL,
  PRIMARY KEY (slot, ord)
);
`;

/**
 * Ordered migration list. Append only.
 *
 * To add one: push `{ version: 2, ... }` with its own `ALTER TABLE` /
 * `CREATE TABLE` statements. Do not touch anything already in this array, and
 * do not renumber. The runner applies every entry whose version exceeds the
 * database's `user_version`, each in its own transaction.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'Initial schema: profile, concerns, scans, routine_items.',
    sql: MIGRATION_1_SQL,
  },
];

/** The `user_version` a fully migrated database ends up at. */
export const LATEST_SCHEMA_VERSION: number = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0
);

/* -------------------------------------------------------------------------- */
/* Guards                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Rows are only as trustworthy as the build that wrote them. A user who
 * installs a newer build and then downgrades can leave values here that this
 * build's unions do not contain, so everything read back as a union member is
 * checked rather than cast.
 */
export function isConcern(value: string): value is Concern {
  return Object.prototype.hasOwnProperty.call(CONCERN_COLUMNS, value);
}

export function isAgeBand(value: string): value is AgeBand {
  return (AGE_BANDS as readonly string[]).includes(value);
}

/* -------------------------------------------------------------------------- */
/* Row mapping                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Written out per concern rather than looped so that the compiler checks
 * exhaustiveness: a new `Concern` breaks this function, and breaking here is
 * the reminder that the scans table needs a migration.
 */
export function concernScoresFromRow(
  row: Pick<ScanRow, ConcernColumn>
): Record<Concern, HeuristicScore> {
  return {
    'fine-lines': row.fine_lines,
    pores: row.pores,
    'uneven-tone': row.uneven_tone,
    dryness: row.dryness,
    redness: row.redness,
    dullness: row.dullness,
  };
}

export function scanFromRow(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    takenAt: row.taken_at,
    overall: row.overall,
    concerns: concernScoresFromRow(row),
    imageUri: row.image_uri,
  };
}

export function profileFromRow(row: ProfileRow): Profile | null {
  // An unrecognised band is not coerced to a plausible one: the app should
  // ask again rather than guess which age bracket someone is in.
  return isAgeBand(row.age_band)
    ? { ageBand: row.age_band, createdAt: row.created_at }
    : null;
}

export function routineItemFromRow(
  row: RoutineItemRow,
  slot: RoutineSlot
): RoutineItem {
  // `slot` is passed in rather than read off the row: every call site selects
  // by slot, so the typed value the caller already holds is the reliable one.
  return { slot, step: row.step, productId: row.product_id, ord: row.ord };
}
