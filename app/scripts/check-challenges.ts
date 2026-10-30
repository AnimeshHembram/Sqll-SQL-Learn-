/**
 * Checks every challenge against real SQLite.
 *
 *   npm run check:challenges
 *
 * Challenges are read with the same loader the build uses
 * (plugins/content/loadChallenges.ts) and evaluated with the same code the app
 * uses (src/features/challenges/evaluate.ts). For each challenge, on fresh
 * in-memory copies of its dataset (Node's built-in node:sqlite):
 *
 *   - every table listed in "tables" exists;
 *   - the solution runs and its result equals the "Expected result" table
 *     (in order when orderMatters is true, in any order otherwise);
 *   - the solution, and every "Other accepted answers" query, is judged correct;
 *   - every "Wrong answers" query gets exactly the feedback kind it is labelled with;
 *   - the starter query is not already a correct answer.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { loadAllContent } from '../plugins/content/index.ts'
import { displayPath } from '../plugins/content/loadContent.ts'
import { evaluateRun, type RunOutcome } from '../src/features/challenges/evaluate.ts'
import { compareTables, formatValue, type ComparableValue } from '../src/features/sql/compare.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const content = {
  dir: path.join(root, 'src/content/modules'),
  datasetsDir: path.join(root, 'src/content/datasets'),
  challengesDir: path.join(root, 'src/content/challenges'),
  quizzesDir: path.join(root, 'src/content/quizzes'),
}

/** Runs one query on a fresh, read-only copy of the dataset, like the app's database worker. */
function run(seed: string, sql: string): RunOutcome {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(seed)
    db.exec('PRAGMA query_only = ON')
    const statement = db.prepare(sql)
    statement.setReturnArrays(true)
    const rows = statement.all() as unknown as ComparableValue[][]
    return { statements: [{ columns: statement.columns().map((column) => column.name), rows, totalRows: rows.length }], error: null }
  } catch (error) {
    return { statements: [], error: (error as Error).message }
  } finally {
    db.close()
  }
}

function tableNames(seed: string): Set<string> {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(seed)
    const rows = db.prepare("SELECT name FROM sqlite_schema WHERE type IN ('table', 'view')").all() as { name: string }[]
    return new Set(rows.map((row) => row.name))
  } finally {
    db.close()
  }
}

function oneLine(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

const failures: string[] = []
const loaded = loadAllContent(content)
failures.push(...loaded.errors)

const { challenges, solutions, wrongAnswers, sourceFiles } = loaded

let queriesChecked = 0

for (const challenge of challenges) {
  const where = displayPath(sourceFiles[challenge.id] ?? challenge.id)
  const solution = solutions[challenge.id]
  const datasetFile = path.join(content.datasetsDir, `${challenge.dataset}.sql`)
  if (!solution || !existsSync(datasetFile)) continue
  const seed = readFileSync(datasetFile, 'utf8')
  const fail = (message: string) => failures.push(`${where}: ${message}`)

  const tables = tableNames(seed)
  for (const table of challenge.tables) {
    if (!tables.has(table)) fail(`table "${table}" (listed in "tables") does not exist in dataset "${challenge.dataset}"`)
  }

  const reference = run(seed, solution.sql)
  queriesChecked += 1
  const result = reference.statements[0]
  if (reference.error || !result || result.columns.length === 0) {
    fail(`the solution does not return a result${reference.error ? ` (${reference.error})` : ''}`)
    continue
  }

  // The written expected result must be exactly what the solution returns.
  const sortRows = <T>(rows: T[][], format: (value: T) => string) =>
    [...rows].sort((a, b) => a.map(format).join('\u0000').localeCompare(b.map(format).join('\u0000')))
  const comparison = challenge.evaluation.orderMatters
    ? compareTables(solution.expected, result)
    : compareTables(
        { columns: solution.expected.columns, rows: sortRows(solution.expected.rows, (text) => text) },
        { columns: result.columns, rows: sortRows(result.rows, formatValue) },
      )
  if (!comparison.matches) fail(`"## Expected result" does not match the solution's result:\n    - ${comparison.differences.join('\n    - ')}`)

  const judge = (sql: string) => {
    queriesChecked += 1
    return evaluateRun(run(seed, sql), reference, challenge.evaluation)
  }

  const self = judge(solution.sql)
  if (self.kind !== 'correct') fail(`the solution is not judged correct against itself (${self.kind})`)

  for (const alternative of solution.alternatives) {
    const feedback = judge(alternative)
    if (feedback.kind !== 'correct') {
      fail(`this "Other accepted answers" query is judged ${feedback.kind}, not correct: ${feedback.title}\n      ${oneLine(alternative)}`)
    }
  }

  for (const wrong of wrongAnswers[challenge.id] ?? []) {
    const feedback = judge(wrong.sql)
    if (feedback.kind !== wrong.kind) {
      fail(`this "Wrong answers" query is judged ${feedback.kind}, but it is labelled ${wrong.kind}: ${feedback.title}\n      ${oneLine(wrong.sql)}`)
    }
  }

  if (judge(challenge.starterSql).kind === 'correct') fail('the starter query is already a correct answer')
}

const wrongCount = Object.values(wrongAnswers).reduce((total, list) => total + list.length, 0)
console.log(
  `Checked ${challenges.length} challenges by running ${queriesChecked} queries in SQLite ` +
    `(solutions, other accepted answers, ${wrongCount} wrong answers and starter queries).`,
)
if (failures.length > 0) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'}:\n  - ${failures.join('\n  - ')}`)
  process.exit(1)
}
console.log(`All challenges check out. ${loaded.quizzes.length} quizzes are valid.`)
