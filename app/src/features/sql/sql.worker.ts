/**
 * Database worker. Runs SQLite (sql.js, compiled to WebAssembly) away from the
 * UI thread. Holds one session database, created from bookstore.sql, that keeps
 * the learner's changes until it is reset.
 *
 * SQL Path projects have their own datasets. Each is loaded the first time one of
 * its tasks runs (a separate file in the web build, inlined in the offline build),
 * so the bookstore stays the only dataset most visits ever load.
 *
 * It also evaluates challenge submissions. The reference queries are loaded
 * here, inside the worker, so they never pass through the page: the page sends
 * a challenge id and the learner's SQL, and gets back feedback and the learner's
 * own result. Solutions are loaded one group at a time, the first time an
 * answer in that group is checked, so the worker stays small as daily problems
 * are added. The page receives a solution only when the learner asks to see it.
 *
 * Requests are processed one at a time, in the order they arrive.
 */

import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'
import { solutionLoaders } from 'virtual:sql-learner-solution-index'
import bookstoreSql from '../../content/datasets/bookstore.sql?raw'
import type { ChallengeSolution } from '../../content/types.ts'
import { evaluateRun, type RunOutcome } from '../challenges/evaluate.ts'
import { execute } from './execute.ts'
import type {
  ColumnInfo,
  EngineInfo,
  EvaluationResult,
  ExecuteResult,
  TableInfo,
  WorkerRequest,
  WorkerResponse,
} from './protocol.ts'

/** Every dataset except the bookstore, loaded on demand. Keyed by file path. */
const otherDatasets = import.meta.glob<string>(['../../content/datasets/*.sql', '!../../content/datasets/bookstore.sql'], {
  query: '?raw',
  import: 'default',
})
const datasetText = new Map<string, Promise<string>>()

let sqlJs: Promise<SqlJsStatic> | null = null
let session: Database | null = null

function loadSqlJs(): Promise<SqlJsStatic> {
  // The WebAssembly file is bundled with the app, so nothing is fetched from another site.
  sqlJs ??= initSqlJs({ locateFile: () => wasmUrl })
  return sqlJs
}

/** The SQL that creates a dataset: the bookstore unless another dataset is named. */
function datasetSql(dataset: string | undefined): Promise<string> {
  if (!dataset || dataset === 'bookstore') return Promise.resolve(bookstoreSql)
  let text = datasetText.get(dataset)
  if (!text) {
    const load = otherDatasets[`../../content/datasets/${dataset}.sql`]
    if (!load) return Promise.reject(new Error(`There is no dataset "${dataset}".`))
    text = load()
    // A failed download (for example a lost connection) can be tried again.
    text.catch(() => datasetText.delete(dataset))
    datasetText.set(dataset, text)
  }
  return text
}

async function freshDatabase(dataset?: string): Promise<Database> {
  const [SQL, seed] = await Promise.all([loadSqlJs(), datasetSql(dataset)])
  const database = new SQL.Database()
  database.exec(seed)
  return database
}

async function sessionDatabase(): Promise<Database> {
  session ??= await freshDatabase()
  return session
}

/**
 * Runs SQL on a brand-new copy of the dataset that refuses writes
 * (PRAGMA query_only), then discards it. Used for challenge evaluation, so a
 * submission can never affect the practice database, the reference query or
 * the next submission.
 */
async function isolatedRun(sql: string, dataset?: string): Promise<ExecuteResult> {
  const database = await freshDatabase(dataset)
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

/** Loads (once per group) and returns a challenge's, exercise's or daily problem's solution. */
async function solutionFor(challengeId: string): Promise<ChallengeSolution | undefined> {
  const load = solutionLoaders[challengeId]
  if (!load) return undefined
  const { solutions } = await load()
  return (solutions as Record<string, ChallengeSolution | undefined>)[challengeId]
}

async function evaluate(challengeId: string, sql: string): Promise<EvaluationResult> {
  const solution = await solutionFor(challengeId)
  if (!solution) throw new Error(`There is no challenge "${challengeId}".`)
  const result = await isolatedRun(sql, solution.dataset)
  const reference = await isolatedRun(solution.sql, solution.dataset)
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
      const scratch = await freshDatabase(request.dataset)
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
    case 'schema': {
      if (!request.dataset) return readSchema(await sessionDatabase())
      const copy = await freshDatabase(request.dataset)
      try {
        return readSchema(copy)
      } finally {
        copy.close()
      }
    }
    case 'evaluate':
      return evaluate(request.challengeId, request.sql)
    case 'solution':
      return (await solutionFor(request.challengeId)) ?? null
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
