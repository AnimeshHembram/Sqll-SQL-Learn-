import type { StatementResult } from './protocol.ts'

const MODIFYING = new Set(['INSERT', 'UPDATE', 'DELETE', 'REPLACE'])

/** The keyword that decides what a statement after a WITH clause does. */
const MAIN_KEYWORDS = new Set(['SELECT', 'VALUES', ...MODIFYING])

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ' ')
}

/** The statement's first keyword, for example "SELECT" or "CREATE". */
export function statementKeyword(sql: string): string {
  return (/[A-Za-z]+/.exec(stripComments(sql))?.[0] ?? '').toUpperCase()
}

/**
 * What the statement does. Usually its first keyword; for a statement that
 * starts with a WITH clause, the first SELECT, INSERT, UPDATE, DELETE, REPLACE
 * or VALUES outside the brackets and quotes of the common table expressions.
 * So `WITH old AS (...) DELETE FROM ...` is a DELETE.
 */
export function statementVerb(sql: string): string {
  const text = stripComments(sql)
  const first = statementKeyword(text)
  if (first !== 'WITH') return first

  const closers: Record<string, string> = { "'": "'", '"': '"', '`': '`', '[': ']' }
  let depth = 0
  let index = 0
  while (index < text.length) {
    const char = text[index]
    const closer = closers[char]
    if (closer) {
      // Skip a quoted string or identifier. A doubled quote inside is an escaped quote.
      index += 1
      while (index < text.length) {
        if (text[index] === closer) {
          if (closer !== ']' && text[index + 1] === closer) index += 2
          else break
        } else index += 1
      }
      index += 1
      continue
    }
    if (char === '(') depth += 1
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0 && /[A-Za-z_]/.test(char)) {
      const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text.slice(index))?.[0] ?? char
      if (MAIN_KEYWORDS.has(word.toUpperCase())) return word.toUpperCase()
      index += word.length
      continue
    }
    index += 1
  }
  return first
}

/** One line describing what a statement did, for statements that return no rows. */
export function describeStatement(result: StatementResult): string {
  const keyword = statementVerb(result.sql)
  if (MODIFYING.has(keyword)) {
    const rows = result.rowsModified
    const verb = { INSERT: 'inserted', UPDATE: 'updated', DELETE: 'deleted', REPLACE: 'inserted or replaced' }[keyword]
    return `${rows} ${rows === 1 ? 'row' : 'rows'} ${verb}.`
  }
  if (result.columns.length > 0) return 'No rows returned.'
  return `${statementKeyword(result.sql) || 'Statement'} ran successfully.`
}

/** For example "3 rows" or "more than 100,000 rows". */
export function describeRowCount(result: StatementResult): string {
  const count = result.totalRows.toLocaleString('en')
  if (result.countCapped) return `more than ${count} rows`
  return `${count} ${result.totalRows === 1 ? 'row' : 'rows'}`
}
