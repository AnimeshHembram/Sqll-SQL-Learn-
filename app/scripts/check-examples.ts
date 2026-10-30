/**
 * Checks every SQL example in the lessons against real SQLite.
 *
 *   npm run check:examples
 *
 * For each module, the dataset named in _module.md is loaded into a fresh
 * in-memory SQLite database (Node's built-in node:sqlite), then:
 *
 *   ```sql          must run without error. If a table follows it (directly, or
 *                   after an "Expected output:" line), the query's result must
 *                   match that table exactly: column names, row order and every value.
 *   ```sql error    must fail with an error.
 *   ```sql syntax   is a pattern with placeholders and is not run.
 *
 * Examples are found and compared with the same code the app uses for its lesson
 * "Run" buttons (plugins/content/markdown.ts and src/features/sql/compare.ts), so
 * this check and what learners see always agree.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { parseFrontMatter } from '../plugins/content/frontMatter.ts'
import { MODULE_FILE, displayPath } from '../plugins/content/loadContent.ts'
import { extractExamples, markdown } from '../plugins/content/markdown.ts'
import { compareTables, type ActualTable, type ComparableValue } from '../src/features/sql/compare.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const modulesDir = path.join(root, 'src/content/modules')
const datasetsDir = path.join(root, 'src/content/datasets')

const failures: string[] = []
let examplesChecked = 0
let resultsCompared = 0
let errorsConfirmed = 0

function run(seed: string, sql: string): ActualTable {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(seed)
    const statement = db.prepare(sql)
    statement.setReturnArrays(true)
    const rows = statement.all() as unknown as ComparableValue[][]
    return { columns: statement.columns().map((column) => column.name), rows }
  } finally {
    db.close()
  }
}

function indent(sql: string): string {
  return sql.trim().replace(/\n/g, '\n      ')
}

function checkLesson(file: string, seed: string) {
  const { body } = parseFrontMatter(readFileSync(file, 'utf8'))
  const where = displayPath(file)

  for (const example of extractExamples(markdown.lexer(body))) {
    if (example.kind === 'error') {
      try {
        run(seed, example.sql)
        failures.push(`${where}: this "sql error" example runs without an error, so it is not a mistake:\n      ${indent(example.sql)}`)
      } catch {
        errorsConfirmed += 1
      }
      continue
    }

    examplesChecked += 1
    let actual: ActualTable
    try {
      actual = run(seed, example.sql)
    } catch (error) {
      failures.push(`${where}: example fails in SQLite (${(error as Error).message}):\n      ${indent(example.sql)}`)
      continue
    }
    if (!example.expected) continue

    const comparison = compareTables(example.expected, actual)
    if (comparison.matches) {
      resultsCompared += 1
    } else {
      failures.push(`${where}: result does not match for\n      ${indent(example.sql)}\n    - ${comparison.differences.join('\n    - ')}`)
    }
  }
}

for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const folder = path.join(modulesDir, entry.name)
  const moduleFile = path.join(folder, MODULE_FILE)
  if (!existsSync(moduleFile)) continue

  const dataset = parseFrontMatter(readFileSync(moduleFile, 'utf8')).data.dataset
  const datasetFile = path.join(datasetsDir, `${String(dataset)}.sql`)
  if (typeof dataset !== 'string' || !existsSync(datasetFile)) {
    failures.push(`${displayPath(moduleFile)}: dataset "${String(dataset)}" not found (run npm run build for details)`)
    continue
  }
  const seed = readFileSync(datasetFile, 'utf8')

  for (const name of readdirSync(folder).sort()) {
    if (name !== MODULE_FILE && name.endsWith('.md')) checkLesson(path.join(folder, name), seed)
  }
}

console.log(
  `Checked ${examplesChecked} SQL examples: ${resultsCompared} results matched SQLite exactly, ` +
    `${errorsConfirmed} "sql error" examples confirmed to fail.`,
)
if (failures.length > 0) {
  console.error(`\n${failures.length} problem${failures.length === 1 ? '' : 's'}:\n  - ${failures.join('\n  - ')}`)
  process.exit(1)
}
console.log('All examples match.')
