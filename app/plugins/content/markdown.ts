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

export type { Token, Tokens }
