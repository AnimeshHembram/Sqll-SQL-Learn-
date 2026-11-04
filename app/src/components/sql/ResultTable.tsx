import { useState } from 'react'
import { formatValue } from '../../features/sql/compare.ts'
import type { CellValue } from '../../features/sql/protocol.ts'
import styles from './ResultTable.module.css'

interface ResultTableProps {
  columns: string[]
  rows: CellValue[][]
  /** Accessible name of the scrollable table region. */
  label: string
}

/** Text longer than this wraps within a column width instead of staying on one line. */
const WRAP_TEXT_LIMIT = 60

/** Text longer than this is shortened in the table, with a button to show all of it. */
const LONG_TEXT_LIMIT = 300

/**
 * A query result as a table, showing values exactly as SQLite returned them:
 * - NULL and empty text have their own markers, so neither can be mistaken for
 *   text (the word "NULL", or a blank cell);
 * - spaces and line breaks inside text are kept;
 * - long text wraps, and very long text is shortened until expanded;
 * - duplicate rows and duplicate column names are shown as they are.
 */
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
                  <Cell value={value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ value }: { value: CellValue }) {
  if (value === null) {
    return (
      <span className={styles.marker}>
        NULL<span className="visually-hidden"> (no value)</span>
      </span>
    )
  }
  if (value === '') {
    return (
      <span className={styles.marker}>
        <span aria-hidden="true">''</span>
        <span className="visually-hidden">empty text</span>
      </span>
    )
  }
  if (typeof value === 'string') return <TextValue text={value} />
  if (typeof value === 'object') return <span className={styles.marker}>{formatValue(value)}</span>
  return <>{String(value)}</>
}

function TextValue({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > LONG_TEXT_LIMIT

  if (text.length <= WRAP_TEXT_LIMIT) return <span className={styles.text}>{text}</span>
  if (!long) return <span className={styles.wrap}>{text}</span>

  return (
    <span className={styles.wrap}>
      {expanded ? text : `${text.slice(0, LONG_TEXT_LIMIT)}…`}{' '}
      <button type="button" className={styles.more} onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        {expanded ? 'Show less' : `Show all ${text.length.toLocaleString('en')} characters`}
      </button>
    </span>
  )
}
