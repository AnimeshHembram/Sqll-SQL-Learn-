/**
 * Unit tests for the challenge evaluator (src/features/challenges/evaluate.ts).
 *
 *   npm run test:evaluation
 *
 * Covers the comparison rules directly, with small hand-made results: NULLs,
 * duplicates, numbers, value types, row order, columns, errors and the rule
 * that feedback never repeats values from the reference result.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { compareResults, evaluateRun, valueKey, type RunOutcome, type RunTable } from '../src/features/challenges/evaluate.ts'
import type { ComparableValue } from '../src/features/sql/compare.ts'

const unordered = { orderMatters: false, checkColumnNames: true }
const ordered = { orderMatters: true, checkColumnNames: true }

function table(columns: string[], rows: ComparableValue[][]): RunTable {
  return { columns, rows, totalRows: rows.length }
}

function outcome(result: RunTable | null, error: string | null = null): RunOutcome {
  return { statements: result ? [result] : [], error }
}

const expected = table(['name', 'city'], [
  ['Aisha', 'Bangalore'],
  ['Sofia', null],
  ['Daniel', 'Bangalore'],
])

test('identical results are correct', () => {
  assert.equal(compareResults(expected, expected, ordered).kind, 'correct')
})

test('row order is ignored unless the challenge requires it', () => {
  const shuffled = table(['name', 'city'], [expected.rows[2], expected.rows[0], expected.rows[1]])
  assert.equal(compareResults(expected, shuffled, unordered).kind, 'correct')
  assert.equal(compareResults(expected, shuffled, ordered).kind, 'wrong-order')
})

test('NULL matches only NULL, never an empty string or the text "NULL"', () => {
  for (const value of ['', 'NULL', 0]) {
    const changed = table(['name', 'city'], [expected.rows[0], ['Sofia', value], expected.rows[2]])
    assert.equal(compareResults(expected, changed, unordered).kind, 'incorrect-output', `value ${JSON.stringify(value)}`)
  }
})

test('duplicates are counted: a repeated row is an extra row', () => {
  const doubled = table(['name', 'city'], [...expected.rows, expected.rows[0]])
  const feedback = compareResults(expected, doubled, unordered)
  assert.equal(feedback.kind, 'extra-rows')
  assert.match(feedback.details.join(' '), /DISTINCT/)
})

test('a missing duplicate is a missing row', () => {
  const withDuplicate = table(['genre'], [['Fantasy'], ['Fantasy'], ['Mystery']])
  const once = table(['genre'], [['Fantasy'], ['Mystery']])
  assert.equal(compareResults(withDuplicate, once, unordered).kind, 'missing-rows')
})

test('numbers compare by value: 18 equals 18.0, and float noise is ignored', () => {
  const reference = table(['total'], [[18], [32.97], [0]])
  const learner = table(['total'], [[18.0], [12.99 + 19.98], [-0]])
  assert.equal(valueKey(12.99 + 19.98), valueKey(32.97))
  assert.equal(valueKey(BigInt(5)), valueKey(5))
  assert.equal(compareResults(reference, learner, ordered).kind, 'correct')
})

test('a real rounding difference is not ignored', () => {
  const reference = table(['average_price'], [[13.75]])
  const learner = table(['average_price'], [[13.746666666666668]])
  assert.equal(compareResults(reference, learner, unordered).kind, 'incorrect-output')
})

test('text that looks like a number is not the number, with a hint about types', () => {
  const reference = table(['price'], [[12.99]])
  const learner = table(['price'], [['12.99']])
  const feedback = compareResults(reference, learner, unordered)
  assert.equal(feedback.kind, 'incorrect-output')
  assert.match(feedback.details.join(' '), /wrong type/)
})

test('text comparison is case-sensitive', () => {
  assert.equal(compareResults(table(['band'], [['budget']]), table(['band'], [['Budget']]), unordered).kind, 'incorrect-output')
})

test('column count and names are checked; names ignore case', () => {
  assert.equal(compareResults(expected, table(['name'], [['Aisha'], ['Sofia'], ['Daniel']]), unordered).kind, 'column-mismatch')
  assert.equal(compareResults(expected, table(['NAME', 'City'], expected.rows), unordered).kind, 'correct')
  const renamed = compareResults(expected, table(['name', 'town'], expected.rows), unordered)
  assert.equal(renamed.kind, 'column-mismatch')
  assert.match(renamed.details[0], /"town"/)
  const swapped = compareResults(expected, table(['city', 'name'], expected.rows.map(([a, b]) => [b, a])), unordered)
  assert.equal(swapped.kind, 'column-mismatch')
  assert.match(swapped.details[0], /different order/)
})

test('column names are ignored when the challenge does not name them', () => {
  const config = { orderMatters: false, checkColumnNames: false }
  assert.equal(compareResults(expected, table(['a', 'b'], expected.rows), config).kind, 'correct')
})

test('an empty result is reported as missing rows', () => {
  assert.equal(compareResults(expected, table(['name', 'city'], []), unordered).kind, 'missing-rows')
})

test('rows that were counted but not sent back count as extra rows', () => {
  const big: RunTable = { columns: ['name', 'city'], rows: expected.rows, totalRows: 5000 }
  assert.equal(compareResults(expected, big, unordered).kind, 'extra-rows')
})

test('errors are classified as syntax errors, writes or other failures', () => {
  const reference = outcome(expected)
  assert.equal(evaluateRun(outcome(null, 'near "FORM": syntax error'), reference, unordered).kind, 'syntax-error')
  assert.equal(evaluateRun(outcome(null, 'incomplete input'), reference, unordered).kind, 'syntax-error')
  assert.equal(evaluateRun(outcome(null, 'no such column: nme'), reference, unordered).kind, 'execution-failure')
  const write = evaluateRun(outcome(null, 'attempt to write a readonly database'), reference, unordered)
  assert.equal(write.kind, 'execution-failure')
  assert.match(write.title, /change the database/)
})

test('several statements, no statement, or a statement without a result table are not accepted', () => {
  const reference = outcome(expected)
  assert.equal(evaluateRun({ statements: [expected, expected], error: null }, reference, unordered).kind, 'incorrect-output')
  assert.equal(evaluateRun({ statements: [], error: null }, reference, unordered).kind, 'incorrect-output')
  assert.equal(evaluateRun(outcome(table([], [])), reference, unordered).kind, 'incorrect-output')
})

test('a broken reference query is reported as a content error, not as learner feedback', () => {
  assert.throws(() => evaluateRun(outcome(expected), outcome(null, 'no such table: x'), unordered))
})

test('feedback never contains values from the reference result', () => {
  const secret = table(['word'], [['zebra-7'], ['quokka-3']])
  const attempts = [
    table(['word'], [['zebra-7']]),
    table(['word'], [['zebra-7'], ['quokka-3'], ['emu']]),
    table(['word'], [['emu'], ['ibis']]),
    table(['word'], [['quokka-3'], ['zebra-7']]),
    table(['term'], [['emu']]),
  ]
  for (const attempt of attempts) {
    for (const config of [ordered, unordered]) {
      const feedback = compareResults(secret, attempt, config)
      const text = feedback.title + feedback.details.join(' ')
      assert.doesNotMatch(text, /zebra-7|quokka-3/, `${feedback.kind}: ${text}`)
    }
  }
})
