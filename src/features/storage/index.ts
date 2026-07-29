/**
 * Persistence.
 *
 * The public surface is the repository: typed async functions that open and
 * migrate the database on first use. Screens should import from here and never
 * reach for `expo-sqlite` directly - SQL lives in `schema.ts` and
 * `repository.ts`, nowhere else.
 *
 * Layering: this folder is pure logic and data access. It imports the `Concern`
 * and `RoutineSlot` unions from the catalogue and `AgeBand` from onboarding,
 * and imports nothing from `src/components` or `app`.
 *
 *     import { getProfile, insertScan, latestScan } from '../src/features/storage';
 *
 *     const profile = await getProfile();      // null until onboarding is done
 *     await insertScan({ overall: 62, concerns: { ... } });
 */

export {
  DEFAULT_SCAN_LIMIT,
  getConcerns,
  getProfile,
  getRoutine,
  insertScan,
  latestScan,
  listScans,
  saveProfile,
  saveRoutine,
  setConcerns,
} from './repository';

/**
 * Connection control. Ordinary screens need none of this - the repository
 * opens and migrates on first use. `getDatabase()` is here so a root layout
 * can prewarm the connection off the critical path; `withDatabase` is
 * deliberately NOT re-exported, so that SQL has nowhere to live except
 * `repository.ts` and `schema.ts`.
 */
export { closeDatabase, DATABASE_NAME, getDatabase, migrate } from './db';

export {
  CONCERN_COLUMNS,
  CONCERN_IDS,
  isAgeBand,
  isConcern,
  LATEST_SCHEMA_VERSION,
  MIGRATIONS,
  SCORE_MAX,
  SCORE_MIN,
  type HeuristicScore,
  type Migration,
  type Profile,
  type RoutineItem,
  type RoutineItemInput,
  type ScanHeuristics,
  type ScanInput,
  type ScanRecord,
} from './schema';
