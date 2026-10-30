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
 * This is a development check only. SQL never runs in the app in this phase.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { parseFrontMatter } from '../plugins/content/frontMatter.ts'
import { MODULE_FILE, displayPath } from '../plugins/content/loadContent.ts'
import { codeKind, markdown, type Token, type Tokens } from '../plugins/content/markdown.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const modulesDir = path.join(root, 'src/content/modules')
const datasetsDir = path.join(root, 'src/content/datasets')

type Cell = string | number | bigint | null | Uint8Array

const failures: string[] = []
let examplesChecked = 0
let resultsCompared = 0
let errorsConfirmed = 0

function formatValue(value: Cell): string {
  return value === null ? 'NULL' : String(value)
}

/** A table cell matches a value if the text is equal, or both are the same number (so 15.50 matches 15.5). */
function cellMatches(text: string, value: Cell): boolean {
  if (value === null) return text === 'NULL'
  if (typeof value === 'number' || typeof value === 'bigint') {
    return text.trim() !== '' && Number(text) === Number(value)
  }
  return text === String(value)
}

function run(seed: string, sql: string): { columns: string[]; rows: Cell[][] } {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec(seed)
    const statement = db.prepare(sql)
    statement.setReturnArrays(true)
    const rows = statement.all() as unknown as Cell[][]
    return { columns: statement.columns().map((column) => column.name), rows }
  } finally {
    db.close()
  }
}

function compare(where: string, sql: string, table: Tokens.Table, actual: { columns: string[]; rows: Cell[][] }) {
  const problems: string[] = []
  const expectedColumns = table.header.map((cell) => cell.text)
  if (expectedColumns.join(' | ') !== actual.columns.join(' | ')) {
    problems.push(`columns: lesson shows [${expectedColumns.join(', ')}], SQLite returns [${actual.columns.join(', ')}]`)
  }
  if (table.rows.length !== actual.rows.length) {
    problems.push(`row count: lesson shows ${table.rows.length}, SQLite returns ${actual.rows.length}`)
  }
  table.rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      const value = actual.rows[r]?.[c]
      if (value === undefined || !cellMatches(cell.text, value)) {
        problems.push(`row ${r + 1}, column ${c + 1}: lesson shows "${cell.text}", SQLite returns "${value === undefined ? '(nothing)' : formatValue(value)}"`)
      }
    })
  })
  if (problems.length > 0) {
    failures.push(`${where}: result does not match for\n      ${sql.trim().replace(/\n/g, '\n      ')}\n    - ${problems.slice(0, 6).join('\n    - ')}`)
  } else {
    resultsCompared += 1
  }
}

function checkLesson(file: string, seed: string) {
  const { body } = parseFrontMatter(readFileSync(file, 'utf8'))
  const tokens = markdown.lexer(body).filter((token: Token) => token.type !== 'space')
  const where = displayPath(file)

  tokens.forEach((token, index) => {
    if (token.type !== 'code') return
    const kind = codeKind(token.lang)
    const sql = token.text

    if (kind === 'error') {
      try {
        run(seed, sql)
        failures.push(`${where}: this "sql error" example runs without an error, so it is not a mistake:\n      ${sql.trim()}`)
      } catch {
        errorsConfirmed += 1
      }
      return
    }
    if (kind !== 'example') return

    examplesChecked += 1
    let actual
    try {
      actual = run(seed, sql)
    } catch (error) {
      failures.push(`${where}: example fails in SQLite (${(error as Error).message}):\n      ${sql.trim()}`)
      return
    }
    // The result table sits directly under the query, optionally after an "Expected output:" line.
    let next = tokens[index + 1]
    if (next?.type === 'paragraph' && next.text.trim() === 'Expected output:') next = tokens[index + 2]
    if (next?.type === 'table') compare(where, sql, next as Tokens.Table, actual)
  })
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
