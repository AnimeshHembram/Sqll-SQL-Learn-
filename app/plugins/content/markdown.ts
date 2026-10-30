import { Marked, type Token, type Tokens } from 'marked'

/**
 * Markdown rules shared by the build (loadContent.ts) and the example checker
 * (scripts/check-examples.ts), so both read lessons the same way.
 */

/**
 * Code block kinds, chosen by the fence label:
 *   ```sql          a runnable example; checked against SQLite
 *   ```sql syntax   a syntax pattern with placeholders; not run
 *   ```sql error    a query that must fail; used in "Common mistakes"
 */
export type CodeKind = 'example' | 'syntax' | 'error'

const CODE_KINDS: Record<string, CodeKind> = {
  sql: 'example',
  'sql syntax': 'syntax',
  'sql error': 'error',
}

export const CODE_LABELS = Object.keys(CODE_KINDS)

export function codeKind(lang: string | undefined): CodeKind | undefined {
  return CODE_KINDS[(lang ?? '').trim().replace(/\s+/g, ' ')]
}

/** Links may point to web pages, email addresses, or other pages and sections of the app. */
export function isAllowedHref(href: string): boolean {
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(href)
  if (!scheme) return true
  return ['http', 'https', 'mailto'].includes(scheme[1].toLowerCase())
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

const CAPTIONS: Record<CodeKind, string> = {
  example: 'SQL example',
  syntax: 'Syntax',
  error: 'This query causes an error',
}

export const markdown = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }: Tokens.Code) {
      const kind = codeKind(lang) ?? 'example'
      return (
        `<figure class="code-block code-${kind}">` +
        `<figcaption>${CAPTIONS[kind]}</figcaption>` +
        `<pre><code class="language-sql">${escapeHtml(text)}</code></pre>` +
        `</figure>\n`
      )
    },
  },
})

export interface ExtractedExample {
  kind: 'example' | 'error'
  sql: string
  /** The table directly under the query (optionally after an "Expected output:" line). */
  expected: { columns: string[]; rows: string[][] } | null
}

/**
 * Lists the runnable (`sql`) and failing (`sql error`) code blocks in document
 * order, which is also the order of their <figure> elements in the HTML.
 */
export function extractExamples(tokens: Token[]): ExtractedExample[] {
  const topLevel = tokens.filter((token) => token.type !== 'space')
  const expectedFor = new Map<Token, ExtractedExample['expected']>()

  topLevel.forEach((token, index) => {
    if (token.type !== 'code') return
    let next = topLevel[index + 1]
    if (next?.type === 'paragraph' && next.text.trim() === 'Expected output:') next = topLevel[index + 2]
    if (next?.type === 'table') {
      const table = next as Tokens.Table
      expectedFor.set(token, {
        columns: table.header.map((cell) => cell.text),
        rows: table.rows.map((row) => row.map((cell) => cell.text)),
      })
    }
  })

  const examples: ExtractedExample[] = []
  markdown.walkTokens(tokens, (token) => {
    if (token.type !== 'code') return
    const kind = codeKind(token.lang)
    if (kind === 'example' || kind === 'error') {
      examples.push({ kind, sql: token.text, expected: kind === 'example' ? (expectedFor.get(token) ?? null) : null })
    }
  })
  return examples
}

export type { Token, Tokens }
