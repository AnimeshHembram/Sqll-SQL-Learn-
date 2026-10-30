import type { StatementResult } from './protocol.ts'

const MODIFYING = new Set(['INSERT', 'UPDATE', 'DELETE', 'REPLACE'])

/** The statement's first keyword, for example "SELECT" or "CREATE". */
export function statementKeyword(sql: string): string {
  const withoutComments = sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, ' ')
  return (/[A-Za-z]+/.exec(withoutComments)?.[0] ?? '').toUpperCase()
}

/** One line describing what a statement did, for statements that return no rows. */
export function describeStatement(result: StatementResult): string {
  const keyword = statementKeyword(result.sql)
  if (MODIFYING.has(keyword)) {
    const rows = result.rowsModified
    const verb = { INSERT: 'inserted', UPDATE: 'updated', DELETE: 'deleted', REPLACE: 'inserted or replaced' }[keyword]
    return `${rows} ${rows === 1 ? 'row' : 'rows'} ${verb}.`
  }
  if (result.columns.length > 0) return 'No rows returned.'
  return `${keyword || 'Statement'} ran successfully.`
}

/** For example "3 rows" or "more than 100,000 rows". */
export function describeRowCount(result: StatementResult): string {
  const count = result.totalRows.toLocaleString('en')
  if (result.countCapped) return `more than ${count} rows`
  return `${count} ${result.totalRows === 1 ? 'row' : 'rows'}`
}
