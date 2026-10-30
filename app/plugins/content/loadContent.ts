import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { LEVELS, type ContentLesson, type ContentModule, type LessonExample, type Level } from '../../src/content/types.ts'
import { parseFrontMatter, type FrontMatterValue } from './frontMatter.ts'
import { CODE_LABELS, codeKind, extractExamples, isAllowedHref, markdown, type Token } from './markdown.ts'

/**
 * Reads every module folder under `contentDir`, validates it and converts the
 * Markdown to HTML. All problems are collected so an author sees every error at once.
 *
 * Layout (see src/content/AUTHORING.md):
 *   <contentDir>/<module-folder>/_module.md    module details + introduction
 *   <contentDir>/<module-folder>/<lesson>.md   one file per lesson
 *   <datasetsDir>/<dataset>.sql                sample data a module's examples use
 */

export interface LoadResult {
  modules: ContentModule[]
  errors: string[]
  /** Every file read, so the dev server can watch them. */
  files: string[]
}

export const MODULE_FILE = '_module.md'

/** Every lesson must have these "##" sections, so all lessons follow the same structure. */
export const REQUIRED_SECTIONS = ['Syntax', 'How the query runs', 'Common mistakes', 'Key takeaways']

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

type FieldKind = 'id' | 'text' | 'positiveInteger' | 'list' | 'level'
type FieldValue = string | number | string[]

const MODULE_FIELDS: Record<string, FieldKind> = {
  id: 'id',
  title: 'text',
  order: 'positiveInteger',
  level: 'level',
  summary: 'text',
  dataset: 'id',
}

const LESSON_FIELDS: Record<string, FieldKind> = {
  id: 'id',
  title: 'text',
  module: 'id',
  order: 'positiveInteger',
  level: 'level',
  summary: 'text',
  duration: 'positiveInteger',
  objectives: 'list',
}

/** Content items keep their source file while loading, for error messages. */
type SourcedLesson = ContentLesson & { file: string; moduleRef: string }
type SourcedModule = Omit<ContentModule, 'lessons'> & { file: string; lessons: SourcedLesson[] }

export function displayPath(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join('/')
}

/** Checks the fields against the schema. Returns the typed values, or null if any field is invalid. */
function readFields(
  data: Record<string, FrontMatterValue>,
  schema: Record<string, FieldKind>,
  report: (message: string) => void,
): Record<string, FieldValue> | null {
  const values: Record<string, FieldValue> = {}
  let valid = true
  const fail = (message: string) => {
    report(message)
    valid = false
  }

  for (const key of Object.keys(data)) {
    if (!(key in schema)) fail(`unknown field "${key}" (allowed: ${Object.keys(schema).join(', ')})`)
  }

  for (const [key, kind] of Object.entries(schema)) {
    const value = data[key]
    if (value === undefined) {
      fail(`missing required field "${key}"`)
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
    } else {
      values[key] = value
    }
  }

  return valid ? values : null
}

/** Checks the Markdown against the content rules and converts it to HTML. */
function renderMarkdown(
  body: string,
  isLesson: boolean,
  report: (message: string) => void,
): { html: string; examples: LessonExample[] } {
  const tokens = markdown.lexer(body)
  const sections = new Set<string>()

  markdown.walkTokens(tokens, (token: Token) => {
    switch (token.type) {
      case 'html':
        report(`raw HTML is not allowed: "${token.raw.trim().slice(0, 40)}"`)
        break
      case 'heading':
        if (token.depth === 1) {
          report(`use "##" or lower for headings; the title from the front matter is the page heading ("${token.text}")`)
        }
        if (token.depth === 2) sections.add(token.text.trim())
        break
      case 'code':
        if (!codeKind(token.lang)) {
          const label = token.lang ? `"${token.lang}"` : 'no label'
          report(`code block has ${label}; label every code block as one of: ${CODE_LABELS.map((l) => '```' + l).join(', ')}`)
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

  if (isLesson) {
    for (const section of REQUIRED_SECTIONS) {
      if (!sections.has(section)) report(`missing required section "## ${section}"`)
    }
  }

  // Wide tables scroll sideways instead of breaking the layout. A scrollable area
  // must be reachable by keyboard (tabindex) and have a unique accessible name,
  // so each table is numbered. Code blocks wrap instead (see Prose.module.css).
  let tableNumber = 0
  // Runnable examples are numbered in document order so the app can attach Run buttons to them.
  let exampleNumber = 0
  const html = markdown
    .parser(tokens)
    .replace(/<table>/g, () => {
      tableNumber += 1
      return `<div class="table-scroll" role="region" aria-label="Table ${tableNumber}" tabindex="0"><table>`
    })
    .replaceAll('</table>', '</table></div>')
    .replace(/<figure class="code-block code-(example|error)">/g, (match) => {
      const tagged = match.replace('>', ` data-example="${exampleNumber}">`)
      exampleNumber += 1
      return tagged
    })

  const examples = extractExamples(tokens)
  if (examples.length !== exampleNumber) {
    report(`internal error: found ${examples.length} runnable examples but tagged ${exampleNumber} code blocks`)
  }
  return { html, examples }
}

function readEntry(file: string, schema: Record<string, FieldKind>, isLesson: boolean, errors: string[]) {
  const report = (message: string) => errors.push(`${displayPath(file)}: ${message}`)
  const { data, body, errors: syntaxErrors } = parseFrontMatter(readFileSync(file, 'utf8'))
  syntaxErrors.forEach(report)
  // Without a readable front matter block, per-field errors would only repeat the problem.
  if (syntaxErrors.length > 0 && Object.keys(data).length === 0) return null

  const fields = readFields(data, schema, report)
  if (body === '') {
    report('the file has no content after the front matter')
    return null
  }
  const { html, examples } = renderMarkdown(body, isLesson, report)
  return fields ? { fields, html, examples, report } : null
}

function reportDuplicates<T>(
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

export function loadContent(contentDir: string, datasetsDir: string): LoadResult {
  const errors: string[] = []
  const files: string[] = []
  const modules: SourcedModule[] = []
  const allLessons: SourcedLesson[] = []

  if (!existsSync(contentDir)) {
    return { modules: [], errors: [`content folder not found: ${displayPath(contentDir)}`], files }
  }

  for (const entry of readdirSync(contentDir, { withFileTypes: true })) {
    const folder = path.join(contentDir, entry.name)
    if (!entry.isDirectory()) {
      errors.push(`${displayPath(folder)}: unsupported file; content must be inside a module folder`)
      continue
    }

    const names = readdirSync(folder).sort()
    if (!names.includes(MODULE_FILE)) {
      errors.push(`${displayPath(folder)}: missing ${MODULE_FILE}`)
      continue
    }
    if (names.every((name) => name === MODULE_FILE)) {
      errors.push(`${displayPath(folder)}: a module needs at least one lesson`)
    }

    const moduleFile = path.join(folder, MODULE_FILE)
    files.push(moduleFile)
    const moduleEntry = readEntry(moduleFile, MODULE_FIELDS, false, errors)
    const moduleId = moduleEntry?.fields.id as string | undefined

    if (moduleEntry) {
      const dataset = moduleEntry.fields.dataset as string
      const datasetFile = path.join(datasetsDir, `${dataset}.sql`)
      if (existsSync(datasetFile)) files.push(datasetFile)
      else moduleEntry.report(`dataset "${dataset}" not found; expected ${displayPath(datasetFile)}`)
    }

    const lessons: SourcedLesson[] = []
    for (const name of names) {
      if (name === MODULE_FILE) continue
      const lessonFile = path.join(folder, name)
      if (!name.endsWith('.md')) {
        errors.push(`${displayPath(lessonFile)}: unsupported file; only .md files are allowed in a module folder`)
        continue
      }
      files.push(lessonFile)
      const lessonEntry = readEntry(lessonFile, LESSON_FIELDS, true, errors)
      if (!lessonEntry) continue

      const { fields, html, examples, report } = lessonEntry
      const moduleRef = fields.module as string
      if (moduleId && moduleRef !== moduleId) {
        report(`"module" is "${moduleRef}", but this file is in the folder of module "${moduleId}" (${displayPath(moduleFile)})`)
        continue
      }
      lessons.push({
        file: lessonFile,
        moduleRef,
        id: fields.id as string,
        title: fields.title as string,
        order: fields.order as number,
        level: fields.level as Level,
        summary: fields.summary as string,
        durationMinutes: fields.duration as number,
        objectives: fields.objectives as string[],
        html,
        examples,
      })
    }

    reportDuplicates(lessons, (l) => l.order, 'lesson order', errors, (l) => displayPath(l.file))
    allLessons.push(...lessons)

    if (!moduleEntry) continue
    const { fields, html } = moduleEntry
    modules.push({
      file: moduleFile,
      id: fields.id as string,
      title: fields.title as string,
      order: fields.order as number,
      level: fields.level as Level,
      summary: fields.summary as string,
      introHtml: html,
      lessons: lessons.sort((a, b) => a.order - b.order),
    })
  }

  reportDuplicates(modules, (m) => m.id, 'module id', errors, (m) => displayPath(m.file))
  reportDuplicates(modules, (m) => m.order, 'module order', errors, (m) => displayPath(m.file))
  // Lesson ids are unique across the whole course so a lesson can be found by id alone.
  reportDuplicates(allLessons, (l) => l.id, 'lesson id', errors, (l) => displayPath(l.file))

  const output: ContentModule[] = modules
    .sort((a, b) => a.order - b.order)
    .map(({ file, lessons, ...module }) => {
      void file
      return {
        ...module,
        lessons: lessons.map(({ file: lessonFile, moduleRef, ...lesson }) => {
          void lessonFile
          void moduleRef
          return lesson
        }),
      }
    })

  return { modules: output, errors, files }
}
