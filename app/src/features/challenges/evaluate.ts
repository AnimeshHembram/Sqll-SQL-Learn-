/**
 * Decides whether a challenge answer is correct by comparing the learner's
 * result with the result of the trusted reference query.
 *
 * Both queries have already run, each on its own fresh copy of the dataset.
 * Only the results are compared, never the SQL text, so any query that produces
 * the right data is accepted.
 *
 * Shared by the database worker (sql.worker.ts), which evaluates submissions in
 * the browser, and by scripts/check-challenges.ts and
 * scripts/test-evaluation.ts, so the build-time checks and the app agree.
 *
 * The feedback describes the learner's own result and how it differs in shape
 * (columns, number of rows, order). It never includes values from the
 * reference result.
 */

import type { EvaluationConfig } from '../../content/types.ts'
import { formatValue, type ComparableValue } from '../sql/compare.ts'

export const FEEDBACK_KINDS = [
  'correct',
  'incorrect-output',
  'syntax-error',
  'missing-rows',
  'extra-rows',
  'wrong-order',
  'column-mismatch',
  'execution-failure',
] as const

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export interface Feedback {
  kind: FeedbackKind
  /** One-sentence verdict. */
  title: string
  /** What to look at next. Never contains reference values. */
  details: string[]
}

/** The result of one statement. `rows` may be cut short; `totalRows` is the real count. */
export interface RunTable {
  columns: string[]
  rows: ComparableValue[][]
  totalRows: number
}

/** Everything a run produced: one entry per statement that finished, and the error that stopped it, if any. */
export interface RunOutcome {
  statements: RunTable[]
  error: string | null
}

/** Numbers equal to 12 significant digits are the same, so 32.970000000000006 matches 32.97 and 18 matches 18.0. */
const SIGNIFICANT_DIGITS = 12

/** A key that is equal for values the evaluator treats as equal. */
export function valueKey(value: ComparableValue): string {
  if (value === null) return 'null'
  if (typeof value === 'number' || typeof value === 'bigint') {
    const number = Number(value)
    if (!Number.isFinite(number)) return `n:${String(number)}`
    // Normalises -0 to 0 and integer-valued reals to integers.
    return `n:${String(Number(number.toPrecision(SIGNIFICANT_DIGITS)) + 0)}`
  }
  if (typeof value === 'string') return `s:${value}`
  return `b:${formatValue(value)}`
}

/** Like valueKey, but numbers and text that look the same match. Used only to explain type differences. */
function looseKey(value: ComparableValue): string {
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return valueKey(Number(value)).slice(2)
  }
  return value === null ? 'null' : valueKey(value).slice(2)
}

function rowKey(row: ComparableValue[], key: (value: ComparableValue) => string): string {
  return JSON.stringify(row.map(key))
}

function countKeys(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return counts
}

/** How many entries of `from` are not matched by an entry of `against` (counting duplicates). */
function unmatched(from: Map<string, number>, against: Map<string, number>): number {
  let total = 0
  for (const [key, count] of from) total += Math.max(0, count - (against.get(key) ?? 0))
  return total
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`
}

const SYNTAX_ERROR = /syntax error|incomplete input|unrecognized token|unterminated/i

/** SQLite reports a write to a database opened read-only with this message. */
const READ_ONLY_ERROR = /readonly database|read-only|query_only/i

/** Feedback for a query that could not run. The message is SQLite's own, about the learner's query. */
export function feedbackForError(message: string): Feedback {
  if (READ_ONLY_ERROR.test(message)) {
    return {
      kind: 'execution-failure',
      title: 'Your SQL tried to change the database.',
      details: [
        'Challenges only accept queries that read data, so INSERT, UPDATE, DELETE, CREATE, DROP and similar statements are not run.',
        'Nothing was changed: every submission runs on its own fresh copy of the sample data.',
      ],
    }
  }
  if (SYNTAX_ERROR.test(message)) {
    return {
      kind: 'syntax-error',
      title: 'Your query has a syntax error.',
      details: [
        `SQLite says: ${message}.`,
        'Check spelling, commas between columns, quotes around text, and the order of clauses (SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT).',
      ],
    }
  }
  return {
    kind: 'execution-failure',
    title: 'Your query could not run.',
    details: [
      `SQLite says: ${message}.`,
      /no such (column|table)/i.test(message)
        ? 'Compare the table and column names with the tables listed beside the editor.'
        : 'Read the message carefully: it names the part of the query SQLite could not use.',
    ],
  }
}

/**
 * Compares a learner run with the reference run.
 *
 * @throws if the reference query itself failed, which is a content error.
 */
export function evaluateRun(learner: RunOutcome, reference: RunOutcome, config: EvaluationConfig): Feedback {
  const expected = reference.statements.at(-1)
  if (reference.error || !expected || expected.columns.length === 0) {
    throw new Error(`The reference query did not produce a result${reference.error ? ` (${reference.error})` : ''}.`)
  }

  if (learner.error) return feedbackForError(learner.error)

  if (learner.statements.length === 0) {
    return {
      kind: 'incorrect-output',
      title: 'There is no query to check.',
      details: ['Write a SELECT query in the editor, then submit it.'],
    }
  }

  if (learner.statements.length > 1) {
    return {
      kind: 'incorrect-output',
      title: 'Submit a single query.',
      details: [
        `Your SQL contains ${learner.statements.length} statements. A challenge answer is one query that returns the requested result.`,
        'Remove the extra statements (or the extra semicolons between them) and submit again.',
      ],
    }
  }

  const actual = learner.statements[0]
  if (actual.columns.length === 0) {
    return {
      kind: 'incorrect-output',
      title: 'Your SQL ran but did not return a result table.',
      details: ['A challenge answer must be a query that returns rows, usually starting with SELECT or WITH.'],
    }
  }

  return compareResults(expected, actual, config)
}

/** Compares two result tables. Exported for tests. */
export function compareResults(expected: RunTable, actual: RunTable, config: EvaluationConfig): Feedback {
  // 1. Columns: the number first, then the names when the task names them.
  if (actual.columns.length !== expected.columns.length) {
    return {
      kind: 'column-mismatch',
      title: `Your result has ${plural(actual.columns.length, 'column')}, but the task asks for ${expected.columns.length}.`,
      details: [
        `Your columns: ${actual.columns.join(', ')}.`,
        config.checkColumnNames
          ? `The task asks for: ${expected.columns.join(', ')}, in that order.`
          : 'Reread the task to see which values it asks for, and list exactly those after SELECT.',
      ],
    }
  }

  if (config.checkColumnNames) {
    const lower = (names: string[]) => names.map((name) => name.toLowerCase())
    const want = lower(expected.columns)
    const got = lower(actual.columns)
    if (want.join('\u0000') !== got.join('\u0000')) {
      const sameSet = [...want].sort().join('\u0000') === [...got].sort().join('\u0000')
      const details = sameSet
        ? [`Your columns are in a different order. The task asks for: ${expected.columns.join(', ')}.`]
        : expected.columns.flatMap((name, index) =>
            want[index] === got[index] ? [] : [`Column ${index + 1} is named "${actual.columns[index]}"; the task asks for "${name}".`],
          )
      details.push('Use AS to name a calculated column, for example COUNT(*) AS book_count.')
      return { kind: 'column-mismatch', title: 'The column names do not match the task.', details }
    }
  }

  // 2. Rows, compared as multisets: every row must appear as many times as in the reference.
  const expectedKeys = expected.rows.map((row) => rowKey(row, valueKey))
  const actualKeys = actual.rows.map((row) => rowKey(row, valueKey))
  const expectedCounts = countKeys(expectedKeys)
  const actualCounts = countKeys(actualKeys)

  // Rows beyond those sent back (very large results) are counted but not compared.
  const notCompared = actual.totalRows - actual.rows.length
  const missing = unmatched(expectedCounts, actualCounts)
  const extra = unmatched(actualCounts, expectedCounts) + notCompared
  const yourRows = `Your query returned ${plural(actual.totalRows, 'row')}.`

  if (missing === 0 && extra === 0) {
    if (config.orderMatters && expectedKeys.join('\n') !== actualKeys.join('\n')) {
      return {
        kind: 'wrong-order',
        title: 'You have the right rows, but in the wrong order.',
        details: [
          'This task asks for a specific order. Check your ORDER BY: the column, the direction (ASC or DESC), and any second column used to break ties.',
        ],
      }
    }
    return {
      kind: 'correct',
      title: 'Correct! Your result matches the expected result.',
      details: [
        config.orderMatters
          ? 'Every row and value matches, in the required order.'
          : 'Every row and value matches. Row order did not matter for this challenge.',
      ],
    }
  }

  if (missing > 0 && extra === 0) {
    return {
      kind: 'missing-rows',
      title: `Your result is missing ${plural(missing, 'row')}.`,
      details: [
        yourRows,
        'Every row you returned is correct, but some rows that belong in the result are not there. Check for a filter that is too strict, a LIMIT, or an INNER JOIN where rows without a match should be kept.',
      ],
    }
  }

  if (extra > 0 && missing === 0) {
    const duplicates = [...actualCounts].some(([key, count]) => count > 1 && count > (expectedCounts.get(key) ?? 0))
    return {
      kind: 'extra-rows',
      title: `Your result has ${plural(extra, 'row')} too many.`,
      details: [
        yourRows,
        duplicates
          ? 'Some rows appear more often than they should. Do you need DISTINCT, GROUP BY, or a join condition that stops rows from being repeated?'
          : 'Every expected row is there, plus some that should not be. Check that your WHERE or HAVING condition removes them.',
      ],
    }
  }

  // Both missing and extra rows: some values are wrong.
  const details = [yourRows]
  if (actual.totalRows === expected.totalRows) {
    details.push(`You have the right number of rows, but ${plural(missing, 'row')} ${missing === 1 ? 'has' : 'have'} different values.`)
  } else {
    details.push(`${plural(actual.totalRows - extra, 'row')} of yours ${actual.totalRows - extra === 1 ? 'matches' : 'match'} the expected result; ${plural(extra, 'row')} ${extra === 1 ? 'does' : 'do'} not.`)
  }

  const looseExpected = countKeys(expected.rows.map((row) => rowKey(row, looseKey)))
  const looseActual = countKeys(actual.rows.map((row) => rowKey(row, looseKey)))
  if (notCompared === 0 && unmatched(looseExpected, looseActual) === 0 && unmatched(looseActual, looseExpected) === 0) {
    details.push('The values look right but some have the wrong type, such as the text \'12.99\' instead of the number 12.99. Remove quotes around numbers.')
  } else {
    details.push('Check calculations and rounding, NULL handling, and that each column holds the value the task asks for.')
  }
  return { kind: 'incorrect-output', title: 'Some values in your result are not correct.', details }
}
