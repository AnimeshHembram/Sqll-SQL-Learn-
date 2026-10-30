/**
 * Database worker. Runs SQLite (sql.js, compiled to WebAssembly) away from the
 * UI thread. Holds one session database, created from bookstore.sql, that keeps
 * the learner's changes until it is reset.
 *
 * Requests are processed one at a time, in the order they arrive.
 */

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import bookstoreSql from '../../content/datasets/bookstore.sql?raw'
import {
  MAX_ROWS_COUNTED,
  MAX_ROWS_RETURNED,
  type CellValue,
  type ColumnInfo,
  type EngineInfo,
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
