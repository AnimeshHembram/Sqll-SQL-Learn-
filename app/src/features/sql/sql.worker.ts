/**
 * Database worker. Runs SQLite (sql.js, compiled to WebAssembly) away from the
 * UI thread. Holds one session database, created from bookstore.sql, that keeps
 * the learner's changes until it is reset.
 *
 * It also evaluates challenge submissions. The reference queries are imported
 * here, inside the worker, so they never pass through the page: the page sends
 * a challenge id and the learner's SQL, and gets back feedback and the learner's
 * own result.
 *
 * Requests are processed one at a time, in the order they arrive.
 */

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { solutions } from 'virtual:sql-learner-challenge-solutions'
import bookstoreSql from '../../content/datasets/bookstore.sql?raw'
import type { ChallengeSolution } from '../../content/types.ts'
import { evaluateRun, type RunOutcome } from '../challenges/evaluate.ts'
import {
  MAX_ROWS_COUNTED,
  MAX_ROWS_RETURNED,
  type CellValue,
  type ColumnInfo,
  type EngineInfo,
  type EvaluationResult,
  type ExecuteResult,
  type StatementResult,
  type TableInfo,
  type WorkerRequest,
  type WorkerResponse,
} from './protocol.ts'

let sqlJs: Promise<SqlJsStatic> | null = null
let session: Database | null = null

function loadSqlJs(): Promise<SqlJsStatic> {
  // The WebAssembly file is bundled with the app, so nothing is fetched from another site.
  sqlJs ??= initSqlJs({ locateFile: () => wasmUrl })
  return sqlJs
}

async function freshDatabase(): Promise<Database> {
  const SQL = await loadSqlJs()
  const database = new SQL.Database()
  database.exec(bookstoreSql)
  return database
}

async function sessionDatabase(): Promise<Database> {
  session ??= await freshDatabase()
  return session
}

function toCell(value: unknown): CellValue {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value
  if (value instanceof Uint8Array) return { blob: value.byteLength }
  return String(value)
}

function execute(database: Database, sql: string): ExecuteResult {
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
          if (rows.length < MAX_ROWS_RETURNED) rows.push(statement.get().map(toCell))
          if (totalRows >= MAX_ROWS_COUNTED) {
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

/**
 * Runs SQL on a brand-new copy of the dataset that refuses writes
 * (PRAGMA query_only), then discards it. Used for challenge evaluation, so a
 * submission can never affect the practice database, the reference query or
 * the next submission.
 */
async function isolatedRun(sql: string): Promise<ExecuteResult> {
  const database = await freshDatabase()
  try {
    database.exec('PRAGMA query_only = ON')
    return execute(database, sql)
  } finally {
    database.close()
  }
}

function toOutcome({ statements, error }: ExecuteResult): RunOutcome {
  return {
    statements: statements.map(({ columns, rows, totalRows }) => ({ columns, rows, totalRows })),
    error: error?.message ?? null,
  }
}

async function evaluate(challengeId: string, sql: string): Promise<EvaluationResult> {
  const solution = (solutions as Record<string, ChallengeSolution | undefined>)[challengeId]
  if (!solution) throw new Error(`There is no challenge "${challengeId}".`)
  const result = await isolatedRun(sql)
  const reference = await isolatedRun(solution.sql)
  return { feedback: evaluateRun(toOutcome(result), toOutcome(reference), solution.evaluation), result }
}

function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`
}

function readSchema(database: Database): TableInfo[] {
  const objects = database.exec(
    "SELECT name, type FROM sqlite_schema WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  const rows = objects[0]?.values ?? []

  return rows.map(([name, type]) => {
    const tableName = String(name)
    const kind = type === 'view' ? 'view' : 'table'
    const columnRows = database.exec(`PRAGMA table_info(${quoteIdentifier(tableName)})`)[0]?.values ?? []
    const columns: ColumnInfo[] = columnRows.map(([, columnName, columnType, notNull, defaultValue, pk]) => ({
      name: String(columnName),
      type: String(columnType ?? ''),
      notNull: notNull === 1,
      primaryKey: Number(pk) > 0,
      defaultValue: defaultValue === null ? null : String(defaultValue),
    }))
    const rowCount =
      kind === 'table'
        ? Number(database.exec(`SELECT COUNT(*) FROM ${quoteIdentifier(tableName)}`)[0]?.values[0]?.[0] ?? 0)
        : null
    return { name: tableName, kind, rowCount, columns }
  })
}

async function handle(request: WorkerRequest): Promise<unknown> {
  switch (request.type) {
    case 'init': {
      const database = await sessionDatabase()
      const version = database.exec('SELECT sqlite_version()')[0]?.values[0]?.[0]
      return { sqliteVersion: String(version) } satisfies EngineInfo
    }
    case 'execute': {
      if (!request.scratch) return execute(await sessionDatabase(), request.sql)
      const scratch = await freshDatabase()
      try {
        return execute(scratch, request.sql)
      } finally {
        scratch.close()
      }
    }
    case 'reset': {
      session?.close()
      session = null
      await sessionDatabase()
      return null
    }
    case 'schema':
      return readSchema(await sessionDatabase())
    case 'evaluate':
      return evaluate(request.challengeId, request.sql)
  }
}

let queue: Promise<void> = Promise.resolve()

self.addEventListener('message', (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  queue = queue.then(async () => {
    let response: WorkerResponse
    try {
      response = { id: request.id, ok: true, value: await handle(request) }
    } catch (error) {
      response = { id: request.id, ok: false, error: error instanceof Error ? error.message : String(error) }
    }
    self.postMessage(response)
  })
})
