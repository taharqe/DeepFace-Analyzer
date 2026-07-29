import type { Concern, RoutineSlot } from '../catalogue/types';
import type { AgeBand } from '../onboarding/questions';
import { withDatabase } from './db';
import {
  CONCERN_COLUMNS,
  CONCERN_IDS,
  isConcern,
  profileFromRow,
  routineItemFromRow,
  scanFromRow,
  SCORE_MAX,
  SCORE_MIN,
  type ConcernRow,
  type Profile,
  type ProfileRow,
  type RoutineItem,
  type RoutineItemInput,
  type RoutineItemRow,
  type ScanInput,
  type ScanRecord,
  type ScanRow,
} from './schema';

/**
 * The only module that talks to the database.
 *
 * Every function here is safe to call before anything has been initialised -
 * the connection opens and migrates itself on first use (see `db.ts`) - and
 * safe to call concurrently, because all statements are serialised onto one
 * connection.
 *
 * Nothing here validates that a score MEANS anything. It validates ranges and
 * ids so that a corrupt row cannot enter the history, and stops there.
 */

/* -------------------------------------------------------------------------- */
/* Statements                                                                 */
/* -------------------------------------------------------------------------- */

const SCAN_CONCERN_COLUMNS: readonly string[] = CONCERN_IDS.map(
  (id) => CONCERN_COLUMNS[id]
);

/** Read order. Explicit column lists, never `SELECT *` - the row type is a contract. */
const SCAN_READ_COLUMNS: readonly string[] = [
  'id',
  'taken_at',
  'overall',
  ...SCAN_CONCERN_COLUMNS,
  'image_uri',
];

/** Write order. `id` is assigned by SQLite. */
const SCAN_WRITE_COLUMNS: readonly string[] = [
  'taken_at',
  'overall',
  ...SCAN_CONCERN_COLUMNS,
  'image_uri',
];

const SQL = {
  upsertProfile: `INSERT INTO profile (id, age_band, created_at)
                  VALUES (1, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET age_band = excluded.age_band`,
  selectProfile: 'SELECT age_band, created_at FROM profile WHERE id = 1',

  deleteConcerns: 'DELETE FROM concerns',
  insertConcern: 'INSERT INTO concerns (concern, ord) VALUES (?, ?)',
  selectConcerns: 'SELECT concern FROM concerns ORDER BY ord ASC',

  insertScan: `INSERT INTO scans (${SCAN_WRITE_COLUMNS.join(', ')})
               VALUES (${SCAN_WRITE_COLUMNS.map(() => '?').join(', ')})`,
  // taken_at then id: two scans in the same millisecond still order by
  // insertion, so "latest" is never ambiguous.
  selectScans: `SELECT ${SCAN_READ_COLUMNS.join(', ')} FROM scans
                ORDER BY taken_at DESC, id DESC LIMIT ?`,
  selectLatestScan: `SELECT ${SCAN_READ_COLUMNS.join(', ')} FROM scans
                     ORDER BY taken_at DESC, id DESC LIMIT 1`,

  deleteRoutine: 'DELETE FROM routine_items WHERE slot = ?',
  insertRoutineItem: `INSERT INTO routine_items (slot, ord, step, product_id)
                      VALUES (?, ?, ?, ?)`,
  selectRoutine: `SELECT slot, step, product_id, ord FROM routine_items
                  WHERE slot = ? ORDER BY ord ASC`,
} as const;

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Store the age band. Idempotent, and re-answering keeps the original
 * `createdAt` - it records when the person first started, not when they last
 * edited an answer.
 */
export async function saveProfile(ageBand: AgeBand): Promise<Profile> {
  return withDatabase(async (db) => {
    await db.runAsync(SQL.upsertProfile, [ageBand, Date.now()]);
    const row = await db.getFirstAsync<ProfileRow>(SQL.selectProfile);
    if (row === null) {
      throw new Error('[storage] Profile disappeared immediately after write.');
    }
    const profile = profileFromRow(row);
    if (profile === null) {
      throw new Error(`[storage] Refusing to return unknown age band: ${row.age_band}`);
    }
    return profile;
  });
}

/**
 * `null` when onboarding has never been completed - and also when the stored
 * band is not one this build knows (see `profileFromRow`). Callers should
 * treat both the same way: ask the question again.
 */
export async function getProfile(): Promise<Profile | null> {
  return withDatabase(async (db) => {
    const row = await db.getFirstAsync<ProfileRow>(SQL.selectProfile);
    return row === null ? null : profileFromRow(row);
  });
}

/* -------------------------------------------------------------------------- */
/* Concerns                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Replace the whole selection - concerns are a multi-select, so the set the
 * user is looking at is the truth, including the empty set. Array order is
 * preserved and read back by `getConcerns`.
 */
export async function setConcerns(concerns: readonly Concern[]): Promise<void> {
  const deduped = [...new Set(concerns)];
  return withDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(SQL.deleteConcerns);
      for (const [ord, concern] of deduped.entries()) {
        await db.runAsync(SQL.insertConcern, [concern, ord]);
      }
    });
  });
}

/**
 * Selection order preserved. Ids this build does not recognise are dropped
 * rather than surfaced as an unusable string.
 */
export async function getConcerns(): Promise<Concern[]> {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<ConcernRow>(SQL.selectConcerns);
    return rows.map((r) => r.concern).filter(isConcern);
  });
}

/* -------------------------------------------------------------------------- */
/* Scans                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * [E] Default page size for `listScans`. Chosen to comfortably cover the
 *     12-week window Insights plots (`features/insights/trend.ts`) even at
 *     more than one scan a week, while staying small enough to hand straight
 *     to a list.
 */
export const DEFAULT_SCAN_LIMIT = 30;

/**
 * Append one scan to the history. Scans are immutable: there is no update and
 * no delete, because a record of what was observed on a date is only useful if
 * it cannot be quietly rewritten afterwards.
 *
 * Throws `RangeError` if any score is not a finite number within 0-100.
 * Out-of-range scores are rejected, never clamped - a clamp would invent a
 * plausible value and hide the pipeline bug that produced it.
 */
export async function insertScan(input: ScanInput): Promise<ScanRecord> {
  const takenAt = input.takenAt ?? Date.now();
  const imageUri = input.imageUri ?? null;

  assertScore('overall', input.overall);
  for (const id of CONCERN_IDS) {
    assertScore(id, input.concerns[id]);
  }
  if (!Number.isFinite(takenAt)) {
    throw new RangeError(`[storage] takenAt must be epoch ms, got ${takenAt}`);
  }

  const values: (string | number | null)[] = [
    takenAt,
    input.overall,
    ...CONCERN_IDS.map((id) => input.concerns[id]),
    imageUri,
  ];

  return withDatabase(async (db) => {
    const result = await db.runAsync(SQL.insertScan, values);
    return {
      id: result.lastInsertRowId,
      takenAt,
      overall: input.overall,
      // Copied, not aliased: the returned record is a snapshot of what was
      // written and must not change if the caller mutates its input.
      concerns: { ...input.concerns },
      imageUri,
    };
  });
}

/** Newest first. Throws `RangeError` on a non-positive or fractional limit. */
export async function listScans(
  limit: number = DEFAULT_SCAN_LIMIT
): Promise<ScanRecord[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`[storage] listScans limit must be >= 1, got ${limit}`);
  }
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<ScanRow>(SQL.selectScans, [limit]);
    return rows.map(scanFromRow);
  });
}

/** `null` until the first scan is stored. */
export async function latestScan(): Promise<ScanRecord | null> {
  return withDatabase(async (db) => {
    const row = await db.getFirstAsync<ScanRow>(SQL.selectLatestScan);
    return row === null ? null : scanFromRow(row);
  });
}

/* -------------------------------------------------------------------------- */
/* Routine                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Replace one slot's items. Position in the array becomes `ord`, which is the
 * order the routine is performed in - passing a reordered array is how a
 * reorder is saved. The other slot is untouched.
 */
export async function saveRoutine(
  slot: RoutineSlot,
  items: readonly RoutineItemInput[]
): Promise<void> {
  return withDatabase(async (db) => {
    await db.withTransactionAsync(async () => {
      await db.runAsync(SQL.deleteRoutine, [slot]);
      for (const [ord, item] of items.entries()) {
        await db.runAsync(SQL.insertRoutineItem, [
          slot,
          ord,
          item.step,
          item.productId,
        ]);
      }
    });
  });
}

/** In `ord` order. Empty until a routine is saved for that slot. */
export async function getRoutine(slot: RoutineSlot): Promise<RoutineItem[]> {
  return withDatabase(async (db) => {
    const rows = await db.getAllAsync<RoutineItemRow>(SQL.selectRoutine, [slot]);
    return rows.map((row) => routineItemFromRow(row, slot));
  });
}

/* -------------------------------------------------------------------------- */
/* Internals                                                                  */
/* -------------------------------------------------------------------------- */

function assertScore(label: string, value: number): void {
  if (!Number.isFinite(value) || value < SCORE_MIN || value > SCORE_MAX) {
    throw new RangeError(
      `[storage] Score "${label}" must be a number within ${SCORE_MIN}-${SCORE_MAX}, got ${value}`
    );
  }
}
