import { MAX_ROWS_RETURNED, type ExecuteResult } from '../../features/sql/protocol.ts'
import { describeRowCount, describeStatement } from '../../features/sql/statements.ts'
import { ResultTable } from './ResultTable.tsx'
import styles from './QueryResults.module.css'

interface QueryResultsProps {
  result: ExecuteResult
}

/** The outcome of every statement in a run, followed by the error if one failed. */
export function QueryResults({ result }: QueryResultsProps) {
  const { statements, error } = result
  const several = statements.length + (error ? 1 : 0) > 1

  return (
    <div className={styles.results}>
      {statements.length === 0 && !error && (
        <p className={styles.note}>Nothing to run. The editor contains no SQL statements.</p>
      )}

      {statements.map((statement, index) => (
        <section key={index} className={styles.statement} aria-label={`Result of statement ${index + 1}`}>
          {several && (
            <p className={styles.statementLabel}>
              Statement {index + 1}: <code>{truncate(statement.sql)}</code>
            </p>
          )}
          {statement.columns.length > 0 && statement.totalRows > 0 ? (
            <>
              <p className={styles.summary}>
                {describeRowCount(statement)}
                {statement.totalRows > statement.rows.length &&
                  `. Showing the first ${MAX_ROWS_RETURNED.toLocaleString('en')}; add a LIMIT or WHERE clause to see specific rows.`}
              </p>
              <ResultTable
                columns={statement.columns}
                rows={statement.rows}
                label={several ? `Result table for statement ${index + 1}` : 'Result table'}
              />
            </>
          ) : statement.columns.length > 0 ? (
            <div className={styles.empty}>
              <p className={styles.emptyTitle}>No rows returned</p>
              <p className={styles.note}>
                The query ran, but no rows matched. Columns: {statement.columns.join(', ')}.
              </p>
            </div>
          ) : (
            <p className={styles.success}>{describeStatement(statement)}</p>
          )}
        </section>
      ))}

      {error && (
        <div className={styles.error} role="alert">
          <p className={styles.errorTitle}>
            {several ? `Statement ${error.statementIndex + 1} failed` : 'The query failed'}
          </p>
          <p className={styles.errorMessage}>
            <code>{error.message}</code>
          </p>
          {error.statementIndex > 0 && (
            <p className={styles.note}>
              The {error.statementIndex === 1 ? 'statement' : `${error.statementIndex} statements`} before it ran, and
              any changes they made were kept. Statements after it did not run.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function truncate(sql: string): string {
  const oneLine = sql.replace(/\s+/g, ' ').trim()
  return oneLine.length > 80 ? `${oneLine.slice(0, 77)}...` : oneLine
}
