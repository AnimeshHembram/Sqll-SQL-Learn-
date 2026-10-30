import { formatValue } from '../../features/sql/compare.ts'
import type { CellValue } from '../../features/sql/protocol.ts'
import styles from './ResultTable.module.css'

interface ResultTableProps {
  columns: string[]
  rows: CellValue[][]
  /** Accessible name of the scrollable table region. */
  label: string
}

/** A query result as a table. NULL is shown in a distinct style so it cannot be mistaken for the text "NULL". */
export function ResultTable({ columns, rows, label }: ResultTableProps) {
  return (
    <div className={styles.scroll} role="region" aria-label={label} tabIndex={0}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, columnIndex) => (
                <td key={columnIndex}>
                  {value === null ? (
                    <span className={styles.null}>
                      NULL<span className="visually-hidden"> (no value)</span>
                    </span>
                  ) : typeof value === 'object' ? (
                    <span className={styles.special}>{formatValue(value)}</span>
                  ) : (
                    String(value)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
