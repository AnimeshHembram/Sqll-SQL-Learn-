/**
 * Tests for SQL execution and how results are described
 * (src/features/sql/execute.ts and statements.ts).
 *
 *   npm run test:sql
 *
 * Runs the same execute() the database worker uses, on the same sql.js build,
 * against the bookstore dataset: empty input, malformed SQL, several
 * statements, empty results, NULLs, empty text, duplicates, large integers,
 * BLOBs, large results and the row limits.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { before, test } from 'node:test'
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js'
import { evaluateRun, type RunOutcome } from '../src/features/challenges/evaluate.ts'
import { execute, toCell } from '../src/features/sql/execute.ts'
import type { ExecuteResult } from '../src/features/sql/protocol.ts'
import { describeRowCount, describeStatement, statementVerb } from '../src/features/sql/statements.ts'

const bookstore = readFileSync(new URL('../src/content/datasets/bookstore.sql', import.meta.url), 'utf8')

let SQL: SqlJsStatic

before(async () => {
  SQL = await initSqlJs()
})

function fresh(): Database {
  const database = new SQL.Database()
  database.exec(bookstore)
  return database
}

function run(sql: string, database = fresh()): ExecuteResult {
  return execute(database, sql)
}

// --- Input that runs nothing --------------------------------------------------------

test('empty, blank and comment-only input runs nothing and is not an error', () => {
  for (const sql of ['', '   \n\t ', '-- just a comment', '/* block */', '-- a\n/* b */\n']) {
    const result = run(sql)
    assert.deepEqual(result.statements, [], JSON.stringify(sql))
    assert.equal(result.error, null)
  }
})

test('stray semicolons do not create extra statements', () => {
  const result = run('SELECT 1;;  ;')
  assert.equal(result.statements.length, 1)
  assert.equal(result.error, null)
})

// --- Errors -----------------------------------------------------------------------------

test('a syntax error is reported with SQLite\'s message and the failing statement', () => {
  const result = run('SELEC title FROM books')
  assert.deepEqual(result.statements, [])
  assert.equal(result.error?.statementIndex, 0)
  assert.match(result.error?.message ?? '', /syntax error/)
})

test('incomplete SQL is an error, not a silent empty result', () => {
  assert.match(run('SELECT * FROM books WHERE').error?.message ?? '', /incomplete input/)
})

test('statements before an error keep their results; statements after it do not run', () => {
  const database = fresh()
  const result = run("SELECT 1 AS one; INSERT INTO authors (name, country) VALUES ('X', 'Y'); SELEC 2; SELECT 3", database)
  assert.equal(result.statements.length, 2)
  assert.deepEqual(result.statements[0].rows, [[1]])
  assert.equal(result.error?.statementIndex, 2)
  // The INSERT before the error was kept.
  assert.equal(database.exec("SELECT COUNT(*) FROM authors WHERE name = 'X'")[0].values[0][0], 1)
})

test('a run-time error is reported even after rows were produced', () => {
  const result = run('SELECT abs(-9223372036854775808)')
  assert.match(result.error?.message ?? '', /integer overflow/)
})

test('unknown tables and columns are errors', () => {
  assert.match(run('SELECT * FROM nope').error?.message ?? '', /no such table/)
  assert.match(run('SELECT nope FROM books').error?.message ?? '', /no such column/)
})

// --- Results ----------------------------------------------------------------------------

test('a query that matches no rows still reports its columns', () => {
  const [statement] = run('SELECT title, price FROM books WHERE price < 0').statements
  assert.deepEqual(statement.columns, ['title', 'price'])
  assert.deepEqual(statement.rows, [])
  assert.equal(statement.totalRows, 0)
  assert.equal(describeStatement(statement), 'No rows returned.')
})

test('NULL, empty text, spaces and line breaks are returned exactly', () => {
  const [statement] = run("SELECT NULL AS n, '' AS e, '  padded ' AS p, 'a\nb' AS lines, 'NULL' AS word").statements
  assert.deepEqual(statement.rows, [[null, '', '  padded ', 'a\nb', 'NULL']])
})

test('duplicate rows and duplicate column names are kept', () => {
  const [statement] = run('SELECT 1 AS a, 1 AS a UNION ALL SELECT 1, 1').statements
  assert.deepEqual(statement.columns, ['a', 'a'])
  assert.deepEqual(statement.rows, [[1, 1], [1, 1]])
})

test('integers beyond 2^53 are exact; ordinary integers and reals stay numbers', () => {
  const [statement] = run('SELECT 9007199254740993, -9223372036854775808, 42, 1.5, 0.1 + 0.2').statements
  assert.deepEqual(statement.rows[0], [9007199254740993n, -9223372036854775808n, 42, 1.5, 0.1 + 0.2])
  assert.equal(typeof statement.rows[0][2], 'number')
})

test('cell conversion: safe BigInts become numbers, BLOBs are summarised', () => {
  assert.equal(toCell(5n), 5)
  assert.equal(toCell(BigInt(Number.MAX_SAFE_INTEGER) + 1n), BigInt(Number.MAX_SAFE_INTEGER) + 1n)
  assert.deepEqual(toCell(new Uint8Array(3)), { blob: 3 })
  assert.deepEqual(run('SELECT zeroblob(4)').statements[0].rows, [[{ blob: 4 }]])
})

test('every statement in a run gets its own result', () => {
  const result = run('SELECT COUNT(*) FROM books; SELECT title FROM books WHERE 0; CREATE TABLE t (x)')
  assert.equal(result.statements.length, 3)
  assert.deepEqual(result.statements.map((statement) => statement.columns.length), [1, 1, 0])
  assert.equal(describeStatement(result.statements[2]), 'CREATE ran successfully.')
})

test('elapsed time is measured and never negative', () => {
  const { durationMs } = run('SELECT * FROM books')
  assert.ok(Number.isFinite(durationMs) && durationMs >= 0)
})

// --- Large results ------------------------------------------------------------------------

const countTo = (n: number) => `WITH RECURSIVE c(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM c WHERE x < ${n}) SELECT x FROM c`

test('large results send a limited number of rows but count them all', () => {
  const [statement] = execute(fresh(), countTo(2500), { returned: 1000, counted: 100_000 }).statements
  assert.equal(statement.rows.length, 1000)
  assert.equal(statement.totalRows, 2500)
  assert.equal(statement.countCapped, false)
  assert.deepEqual(statement.rows.at(-1), [1000])
  assert.equal(describeRowCount(statement), '2,500 rows')
})

test('counting stops at the limit and says "more than" only when more rows exist', () => {
  const capped = execute(fresh(), countTo(60), { returned: 10, counted: 50 }).statements[0]
  assert.equal(capped.totalRows, 50)
  assert.equal(capped.countCapped, true)
  assert.equal(describeRowCount(capped), 'more than 50 rows')

  const exact = execute(fresh(), countTo(50), { returned: 10, counted: 50 }).statements[0]
  assert.equal(exact.countCapped, false)
  assert.equal(describeRowCount(exact), '50 rows')
})

// --- Describing statements ----------------------------------------------------------------

test('changes are counted per statement, not carried over from earlier ones', () => {
  const result = run(
    "CREATE TABLE t (x); INSERT INTO t VALUES (1), (2), (3); UPDATE t SET x = x WHERE 0; DELETE FROM t WHERE x > 1; REPLACE INTO t VALUES (9)",
  )
  assert.deepEqual(result.statements.map(describeStatement), [
    'CREATE ran successfully.',
    '3 rows inserted.',
    '0 rows updated.',
    '2 rows deleted.',
    '1 row inserted or replaced.',
  ])
})

test('statements that start with WITH are described by what they do', () => {
  const result = run(
    "CREATE TABLE t (x); INSERT INTO t VALUES (1), (2); WITH old AS (SELECT 1 AS x) DELETE FROM t WHERE x IN (SELECT x FROM old)",
  )
  assert.equal(describeStatement(result.statements[2]), '1 row deleted.')
})

test('the main verb after WITH ignores brackets, quotes and comments', () => {
  assert.equal(statementVerb('WITH a AS (SELECT 1) SELECT * FROM a'), 'SELECT')
  assert.equal(statementVerb('WITH RECURSIVE a(x) AS (SELECT 1 UNION ALL SELECT x FROM a) UPDATE t SET x = 1'), 'UPDATE')
  assert.equal(statementVerb("WITH \"delete\" AS (SELECT 'insert') INSERT INTO t SELECT * FROM \"delete\""), 'INSERT')
  assert.equal(statementVerb('-- note\nWITH a AS (SELECT 1) /* x */ DELETE FROM t'), 'DELETE')
  assert.equal(statementVerb('  insert into t values (1)'), 'INSERT')
  assert.equal(statementVerb('WITH broken'), 'WITH')
})

// --- Evaluation is unchanged ----------------------------------------------------------------

function outcome(result: ExecuteResult): RunOutcome {
  return { statements: result.statements.map(({ columns, rows, totalRows }) => ({ columns, rows, totalRows })), error: result.error?.message ?? null }
}

test('exact large integers still compare equal to the same value written another way', () => {
  const config = { orderMatters: false, checkColumnNames: false }
  const learner = outcome(run('SELECT 9007199254740993 AS v'))
  const reference = outcome(run('SELECT 9007199254740992 + 1 AS v'))
  assert.equal(evaluateRun(learner, reference, config).kind, 'correct')
})

test('a real challenge comparison works end to end on execute() output', () => {
  const config = { orderMatters: true, checkColumnNames: true }
  const reference = outcome(run('SELECT title, price FROM books ORDER BY price DESC'))
  assert.equal(evaluateRun(outcome(run('SELECT title, price FROM books ORDER BY 2 DESC')), reference, config).kind, 'correct')
  assert.equal(evaluateRun(outcome(run('SELECT title, price FROM books ORDER BY price')), reference, config).kind, 'wrong-order')
  assert.equal(evaluateRun(outcome(run('-- nothing')), reference, config).kind, 'incorrect-output')
  assert.equal(evaluateRun(outcome(run('SELECT title price FROM books')), reference, config).kind, 'column-mismatch')
})
