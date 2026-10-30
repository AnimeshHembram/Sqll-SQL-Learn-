/**
 * Compares a query result with the expected result table written in a lesson.
 *
 * Shared by the app (lesson "Run" buttons) and scripts/check-examples.ts, so the
 * build-time check and what learners see always agree.
 */

/** A value from SQLite, as returned by sql.js (app) or node:sqlite (script). */
export type ComparableValue = string | number | bigint | null | Uint8Array | { blob: number }

export interface ExpectedTable {
  columns: string[]
  rows: string[][]
}

export interface ActualTable {
  columns: string[]
  rows: ComparableValue[][]
}

export interface Comparison {
  matches: boolean
  /** Plain-language differences, most important first. Empty when the tables match. */
  differences: string[]
}

/** How a value is shown in lessons and result tables. */
export function formatValue(value: ComparableValue): string {
  if (value === null) return 'NULL'
  if (value instanceof Uint8Array) return `BLOB (${value.byteLength} bytes)`
  if (typeof value === 'object') return `BLOB (${value.blob} bytes)`
  return String(value)
}

/** A lesson cell matches a value if the text is equal, or both are the same number (so "15.50" matches 15.5). */
export function cellMatches(text: string, value: ComparableValue): boolean {
  if (value === null) return text === 'NULL'
  if (typeof value === 'number' || typeof value === 'bigint') {
    return text.trim() !== '' && Number(text) === Number(value)
  }
  return text === formatValue(value)
}

export function compareTables(expected: ExpectedTable, actual: ActualTable, maxDifferences = 6): Comparison {
  const differences: string[] = []

  if (expected.columns.join('\u0000') !== actual.columns.join('\u0000')) {
    differences.push(`Columns: expected ${expected.columns.join(', ')}; got ${actual.columns.join(', ') || '(none)'}.`)
  }
  if (expected.rows.length !== actual.rows.length) {
    differences.push(`Row count: expected ${expected.rows.length}; got ${actual.rows.length}.`)
  }

  expected.rows.forEach((row, r) => {
    row.forEach((text, c) => {
      const value = actual.rows[r]?.[c]
      if (value === undefined || !cellMatches(text, value)) {
        differences.push(
          `Row ${r + 1}, column ${c + 1}: expected "${text}"; got ${value === undefined ? 'nothing' : `"${formatValue(value)}"`}.`,
        )
      }
    })
  })

  return { matches: differences.length === 0, differences: differences.slice(0, maxDifferences) }
}
