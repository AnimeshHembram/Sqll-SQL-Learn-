/**
 * Messages exchanged between the app (sqlEngine.ts) and the database worker
 * (sql.worker.ts). Everything here must be structured-clone friendly.
 */

import type { Feedback } from '../challenges/evaluate.ts'

/**
 * A single value in a result. Integers too large for an exact JavaScript number
 * are sent as BigInt. BLOBs are summarised by size rather than sent whole.
 */
export type CellValue = string | number | bigint | null | { blob: number }

/** Rows sent back per statement. More rows are counted, but not sent or displayed. */
export const MAX_ROWS_RETURNED = 1000

/** Rows counted per statement before counting stops. */
export const MAX_ROWS_COUNTED = 100_000

export interface StatementResult {
  /** The statement's own SQL text. */
  sql: string
  columns: string[]
  /** Up to MAX_ROWS_RETURNED rows. */
  rows: CellValue[][]
  /** Rows produced, up to MAX_ROWS_COUNTED. */
  totalRows: number
  /** True when counting stopped at MAX_ROWS_COUNTED. */
  countCapped: boolean
  /** Rows inserted, updated or deleted. Only meaningful for INSERT, UPDATE, DELETE and REPLACE. */
  rowsModified: number
}

export interface ExecutionError {
  message: string
  /** Zero-based index of the statement that failed. Earlier statements did run. */
  statementIndex: number
}

export interface ExecuteResult {
  statements: StatementResult[]
  error: ExecutionError | null
  durationMs: number
}

export interface ColumnInfo {
  name: string
  type: string
  notNull: boolean
  primaryKey: boolean
  defaultValue: string | null
}

export interface TableInfo {
  name: string
  kind: 'table' | 'view'
  /** Null for views, which are not counted (a view can be expensive to evaluate). */
  rowCount: number | null
  columns: ColumnInfo[]
}

export interface EngineInfo {
  sqliteVersion: string
}

/**
 * The outcome of a challenge submission. Contains the learner's own result and
 * the feedback, never the reference query or its result.
 */
export interface EvaluationResult {
  feedback: Feedback
  result: ExecuteResult
}

export type WorkerRequest =
  | { id: number; type: 'init' }
  /**
   * `scratch` runs against a fresh copy of the dataset and leaves the session database untouched.
   * `dataset` (scratch runs only) names another dataset than the bookstore, such as a project's.
   */
  | { id: number; type: 'execute'; sql: string; scratch: boolean; dataset?: string }
  | { id: number; type: 'reset' }
  /** The session database's tables, or those of `dataset` (a fresh copy) when it is given. */
  | { id: number; type: 'schema'; dataset?: string }
  /** Runs `sql` and the challenge's reference query, each on its own fresh read-only copy of the dataset, and compares them. */
  | { id: number; type: 'evaluate'; challengeId: string; sql: string }
  /** The solution, expected result and explanation, sent only when the learner chooses to see them. Null if unknown. */
  | { id: number; type: 'solution'; challengeId: string }

export type WorkerResponse =
  | { id: number; ok: true; value: unknown }
  | { id: number; ok: false; error: string }
