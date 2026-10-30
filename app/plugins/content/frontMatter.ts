/**
 * Minimal front matter parser for lesson files.
 *
 * Supports exactly what lessons need, and reports anything else as an error:
 *
 *   ---
 *   key: value
 *   list:
 *     - item
 *     - item
 *   ---
 *
 * Values are plain text; surrounding single or double quotes are removed.
 */

export type FrontMatterValue = string | string[]

export interface FrontMatterResult {
  data: Record<string, FrontMatterValue>
  body: string
  errors: string[]
}

const KEY_LINE = /^([a-zA-Z][a-zA-Z0-9]*):(?:[ \t]+(.*))?$/
const LIST_ITEM = /^[ \t]+-[ \t]+(.+)$/

function unquote(value: string): string {
  const trimmed = value.trim()
  const quoted =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  return quoted ? trimmed.slice(1, -1) : trimmed
}

export function parseFrontMatter(source: string): FrontMatterResult {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const errors: string[] = []
  const data: Record<string, FrontMatterValue> = {}

  if (!text.startsWith('---\n')) {
    return { data, body: text, errors: ['the file must start with a front matter block opened by "---"'] }
  }

  const lines = text.split('\n')
  const closing = lines.indexOf('---', 1)
  if (closing === -1) {
    return { data, body: '', errors: ['the front matter block is not closed with "---"'] }
  }

  let currentList: string[] | null = null

  for (let i = 1; i < closing; i++) {
    const line = lines[i]
    const lineNumber = i + 1
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue

    const item = LIST_ITEM.exec(line)
    if (item) {
      if (currentList) {
        currentList.push(unquote(item[1]))
      } else {
        errors.push(`line ${lineNumber}: list item without a key above it`)
      }
      continue
    }

    const pair = KEY_LINE.exec(line)
    if (!pair) {
      errors.push(`line ${lineNumber}: expected "key: value" but found "${line.trim()}"`)
      currentList = null
      continue
    }

    const [, key, rawValue] = pair
    if (key in data) {
      errors.push(`line ${lineNumber}: "${key}" is defined more than once`)
    }

    if (rawValue === undefined || rawValue.trim() === '') {
      currentList = []
      data[key] = currentList
    } else {
      currentList = null
      data[key] = unquote(rawValue)
    }
  }

  const body = lines.slice(closing + 1).join('\n').trim()
  return { data, body, errors }
}
