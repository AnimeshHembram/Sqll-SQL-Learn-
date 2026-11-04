/**
 * Runs SQL on a sql.js database and collects each statement's result.
 *
 * Used by the database worker (sql.worker.ts) for practice runs, lesson
 * examples and challenge submissions. It has no browser or bundler imports, so
 * scripts/test-sql-execution.ts runs it in Node against the same sql.js build.
 */

import type { Database, Statement } from 'sql.js'
import { MAX_ROWS_COUNTED, MAX_ROWS_RETURNED, type CellValue, type ExecuteResult, type StatementResult } from './protocol.ts'

export interface ExecuteLimits {
  /** Rows kept and sent back per statement. */
  returned: number
  /** Rows counted per statement before counting stops. */
  counted: number
}

const DEFAULT_LIMITS: ExecuteLimits = { returned: MAX_ROWS_RETURNED, counted: MAX_ROWS_COUNTED }

/**
 * Converts a value from sql.js into a value the page can show.
 *
 * Integers are read as BigInt so that values beyond 2^53 (for example
 * 9007199254740993) are not silently rounded; integers that fit exactly are
 * turned back into ordinary numbers. BLOBs are summarised by size.
 */
export function toCell(value: unknown): CellValue {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'bigint') {
    return value >= BigInt(Number.MIN_SAFE_INTEGER) && value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value
  }
  if (value instanceof Uint8Array) return { blob: value.byteLength }
  return String(value)
}

/**
 * Reads the current row, with integers as BigInt. sql.js supports this option
 * (`get(params, { useBigInt })`), but its published type definitions omit the
 * second argument, so the call is typed here.
 */
function readRow(statement: Statement): unknown[] {
  return (statement.get as (params: null, config: { useBigInt: boolean }) => unknown[]).call(statement, null, {
    useBigInt: true,
  })
}

/**
 * Runs every statement in `sql`, in order, stopping at the first error.
 * Statements before the error keep their results (and their changes).
 * Empty input, or input with only comments, runs nothing and is not an error.
 */
export function execute(database: Database, sql: string, limits: ExecuteLimits = DEFAULT_LIMITS): ExecuteResult {
  const started = performance.now()
  const statements: StatementResult[] = []
  let statementIndex = 0

  try {
    for (const statement of database.iterateStatements(sql)) {
      try {
        const columns = statement.getColumnNames()
        const rows: CellValue[][] = []
        let totalRows = 0
        let countCapped = false
        while (statement.step()) {
          totalRows += 1
          if (rows.length < limits.returned) rows.push(readRow(statement).map(toCell))
          if (totalRows >= limits.counted) {
            // Only "more than" if another row really exists.
            countCapped = statement.step()
            break
          }
        }
        statements.push({
          sql: statement.getSQL(),
          columns,
          rows,
          totalRows,
          countCapped,
          rowsModified: database.getRowsModified(),
        })
      } finally {
        statement.free()
      }
      statementIndex += 1
    }
  } catch (error) {
    return {
      statements,
      error: { message: error instanceof Error ? error.message : String(error), statementIndex },
      durationMs: performance.now() - started,
    }
  }

  return { statements, error: null, durationMs: performance.now() - started }
}
