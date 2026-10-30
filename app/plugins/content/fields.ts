import { LEVELS } from '../../src/content/types.ts'
import type { FrontMatterValue } from './frontMatter.ts'
import { CODE_LABELS, codeKind, isAllowedHref, markdown, type Token, type Tokens } from './markdown.ts'

/**
 * Helpers shared by the challenge and quiz loaders: a front matter schema reader
 * with optional fields, Markdown safety checks, and splitting a file into "##" sections.
 */

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type FieldKind = 'id' | 'text' | 'positiveInteger' | 'list' | 'level' | 'boolean'
export type FieldValue = string | number | boolean | string[]
export interface FieldSpec {
  kind: FieldKind
  optional?: boolean
}

/** Checks the fields against the schema. Returns the typed values, or null if any field is invalid. */
export function readFields(
  data: Record<string, FrontMatterValue>,
  schema: Record<string, FieldSpec>,
  report: (message: string) => void,
): Record<string, FieldValue | undefined> | null {
  const values: Record<string, FieldValue | undefined> = {}
  let valid = true
  const fail = (message: string) => {
    report(message)
    valid = false
  }

  for (const key of Object.keys(data)) {
    if (!(key in schema)) fail(`unknown field "${key}" (allowed: ${Object.keys(schema).join(', ')})`)
  }

  for (const [key, { kind, optional }] of Object.entries(schema)) {
    const value = data[key]
    if (value === undefined) {
      if (!optional) fail(`missing required field "${key}"`)
      continue
    }

    if (kind === 'list') {
      if (!Array.isArray(value) || value.length === 0) fail(`"${key}" must be a list with at least one "- item"`)
      else values[key] = value
      continue
    }

    if (Array.isArray(value) || value === '') {
      fail(`"${key}" must be a single value on the same line`)
      continue
    }

    if (kind === 'id' && !ID_PATTERN.test(value)) {
      fail(`"${key}" must be lowercase letters, numbers and hyphens (for example "select-basics"), not "${value}"`)
    } else if (kind === 'level' && !(LEVELS as readonly string[]).includes(value)) {
      fail(`"${key}" must be one of ${LEVELS.join(', ')}, not "${value}"`)
    } else if (kind === 'positiveInteger') {
      if (/^[1-9][0-9]*$/.test(value)) values[key] = Number(value)
      else fail(`"${key}" must be a whole number greater than 0, not "${value}"`)
    } else if (kind === 'boolean') {
      if (value === 'true' || value === 'false') values[key] = value === 'true'
      else fail(`"${key}" must be true or false, not "${value}"`)
    } else {
      values[key] = value
    }
  }

  return valid ? values : null
}

/** Reports raw HTML, images, unsafe links, "#" headings and unlabelled code blocks. */
export function checkMarkdown(tokens: Token[], report: (message: string) => void, allowedLabels = CODE_LABELS) {
  markdown.walkTokens(tokens, (token: Token) => {
    switch (token.type) {
      case 'html':
        report(`raw HTML is not allowed: "${token.raw.trim().slice(0, 40)}"`)
        break
      case 'heading':
        if (token.depth === 1) report(`use "##" or lower for headings ("${token.text}")`)
        break
      case 'code':
        if (!codeKind(token.lang) || !allowedLabels.includes((token.lang ?? '').trim().replace(/\s+/g, ' '))) {
          const label = token.lang ? `"${token.lang}"` : 'no label'
          report(`code block has ${label}; label code blocks here as one of: ${allowedLabels.map((l) => '```' + l).join(', ')}`)
        }
        break
      case 'link':
        if (!isAllowedHref(token.href)) report(`link "${token.href}" is not allowed; use http, https, mailto or a relative link`)
        break
      case 'image':
        report(`images are not supported yet ("${token.href}")`)
        break
    }
  })
}

/** Converts checked tokens to HTML. Tables scroll sideways in a keyboard-reachable region with its own name. */
export function toHtml(tokens: Token[], tableLabel: string): string {
  let tableNumber = 0
  return markdown
    .parser(tokens)
    .replace(/<table>/g, () => {
      tableNumber += 1
      return `<div class="table-scroll" role="region" aria-label="${tableLabel} table ${tableNumber}" tabindex="0"><table>`
    })
    .replaceAll('</table>', '</table></div>')
}

/** Inline Markdown (a hint, a quiz option) to HTML. */
export function inlineHtml(text: string): string {
  return markdown.parseInline(text) as string
}

export interface Section {
  title: string
  tokens: Token[]
}

/**
 * Splits a body into the content before the first "##" heading and one section
 * per "##" heading. Space tokens are dropped.
 */
export function splitSections(tokens: Token[]): { intro: Token[]; sections: Section[] } {
  const intro: Token[] = []
  const sections: Section[] = []
  for (const token of tokens) {
    if (token.type === 'space') continue
    if (token.type === 'heading' && (token as Tokens.Heading).depth === 2) {
      sections.push({ title: (token as Tokens.Heading).text.trim(), tokens: [] })
    } else if (sections.length > 0) {
      sections[sections.length - 1].tokens.push(token)
    } else {
      intro.push(token)
    }
  }
  return { intro, sections }
}

export function tableFromToken(token: Tokens.Table): { columns: string[]; rows: string[][] } {
  return {
    columns: token.header.map((cell) => cell.text),
    rows: token.rows.map((row) => row.map((cell) => cell.text)),
  }
}

export function reportDuplicates<T>(
  items: T[],
  key: (item: T) => string | number,
  label: string,
  errors: string[],
  where: (item: T) => string,
) {
  const seen = new Map<string | number, T>()
  for (const item of items) {
    const value = key(item)
    const first = seen.get(value)
    if (first) errors.push(`${where(item)}: ${label} "${value}" is already used by ${where(first)}`)
    else seen.set(value, item)
  }
}
