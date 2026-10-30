import type { TableInfo } from '../../features/sql/protocol.ts'
import styles from './SchemaExplorer.module.css'

interface SchemaExplorerProps {
  tables: TableInfo[] | null
  /** Puts a starter query for the table into the editor. */
  onQueryTable: (tableName: string) => void
}

/** Lists the session database's tables and views with their columns. */
export function SchemaExplorer({ tables, onQueryTable }: SchemaExplorerProps) {
  if (!tables) return <p className={styles.note}>Loading the database…</p>
  if (tables.length === 0) {
    return <p className={styles.note}>The database has no tables. Reset it to restore the bookstore data.</p>
  }

  return (
    <ul className={styles.list}>
      {tables.map((table) => (
        <li key={table.name}>
          <details className={styles.table} open={tables.length <= 3}>
            <summary className={styles.summary}>
              <span className={styles.name}>{table.name}</span>
              <span className={styles.meta}>
                {table.kind === 'view'
                  ? 'view'
                  : `${table.rowCount ?? 0} ${table.rowCount === 1 ? 'row' : 'rows'}`}
              </span>
            </summary>
            <table className={styles.columns}>
              <caption className="visually-hidden">Columns of {table.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Column</th>
                  <th scope="col">Type</th>
                </tr>
              </thead>
              <tbody>
                {table.columns.map((column) => (
                  <tr key={column.name}>
                    <td>
                      <code>{column.name}</code>
                      {column.primaryKey && <span className={styles.badge}>primary key</span>}
                    </td>
                    <td>
                      {column.type || <span className={styles.note}>none</span>}
                      {column.notNull && !column.primaryKey && <span className={styles.badge}>not null</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className={styles.query} onClick={() => onQueryTable(table.name)}>
              Query this {table.kind}
            </button>
          </details>
        </li>
      ))}
    </ul>
  )
}
