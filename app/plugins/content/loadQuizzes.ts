import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { LEVELS, QUESTION_TYPES, type ContentQuiz, type Level, type QuestionType, type QuizQuestion } from '../../src/content/types.ts'
import { checkMarkdown, inlineHtml, readFields, reportDuplicates, splitSections, toHtml, type FieldSpec } from './fields.ts'
import { parseFrontMatter } from './frontMatter.ts'
import { displayPath } from './loadContent.ts'
import { markdown, type Token, type Tokens } from './markdown.ts'

/**
 * Reads every quiz file in `quizzesDir` (see src/content/AUTHORING.md). Each
 * "##" section is one question:
 *
 *   ## The question?
 *
 *   Type: predict-output
 *   Topic: ORDER BY
 *   Difficulty: beginner
 *
 *   Optional supporting text or a ```sql block.
 *
 *   - [ ] a wrong option
 *   - [x] the correct option
 *
 *   ### Explanation
 *
 *   Why the correct option is right.
 */

export interface QuizLoadResult {
  quizzes: ContentQuiz[]
  errors: string[]
  files: string[]
}

const FIELDS: Record<string, FieldSpec> = {
  id: { kind: 'id' },
  title: { kind: 'text' },
  order: { kind: 'positiveInteger' },
  difficulty: { kind: 'level' },
  topic: { kind: 'text' },
  summary: { kind: 'text' },
  duration: { kind: 'positiveInteger' },
}

const MIN_OPTIONS = 2

function readMeta(token: Token | undefined, report: (message: string) => void) {
  const lines = token?.type === 'paragraph' ? (token as Tokens.Paragraph).text.split('\n').map((line) => line.trim()) : []
  const meta: Record<string, string> = {}
  for (const line of lines) {
    const match = /^(Type|Topic|Difficulty):\s*(.+)$/.exec(line)
    if (match) meta[match[1]] = match[2].trim()
  }
  if (lines.length !== 3 || Object.keys(meta).length !== 3) {
    report('start the question with three lines: "Type: ...", "Topic: ..." and "Difficulty: ..."')
    return null
  }
  let valid = true
  if (!(QUESTION_TYPES as readonly string[]).includes(meta.Type)) {
    report(`"Type" must be one of ${QUESTION_TYPES.join(', ')}, not "${meta.Type}"`)
    valid = false
  }
  if (!(LEVELS as readonly string[]).includes(meta.Difficulty)) {
    report(`"Difficulty" must be one of ${LEVELS.join(', ')}, not "${meta.Difficulty}"`)
    valid = false
  }
  return valid ? { type: meta.Type as QuestionType, topic: meta.Topic, difficulty: meta.Difficulty as Level } : null
}

export function loadQuizzes(quizzesDir: string): QuizLoadResult {
  const result: QuizLoadResult = { quizzes: [], errors: [], files: [] }
  if (!existsSync(quizzesDir)) {
    result.errors.push(`quizzes folder not found: ${displayPath(quizzesDir)}`)
    return result
  }
  const loaded: (ContentQuiz & { file: string })[] = []

  for (const name of readdirSync(quizzesDir).sort()) {
    const file = path.join(quizzesDir, name)
    if (!name.endsWith('.md')) {
      result.errors.push(`${displayPath(file)}: unsupported file; only .md files are allowed in the quizzes folder`)
      continue
    }
    result.files.push(file)
    const errorsBefore = result.errors.length
    const report = (message: string) => result.errors.push(`${displayPath(file)}: ${message}`)

    const { data, body, errors: syntaxErrors } = parseFrontMatter(readFileSync(file, 'utf8'))
    syntaxErrors.forEach(report)
    if (syntaxErrors.length > 0 && Object.keys(data).length === 0) continue
    const fields = readFields(data, FIELDS, report)

    const tokens = markdown.lexer(body)
    checkMarkdown(tokens, report, ['sql'])
    const { intro, sections } = splitSections(tokens)
    if (intro.length > 0) report('put every question under its own "##" heading')
    if (sections.length === 0) report('a quiz needs at least one question ("## The question?")')

    const questions: QuizQuestion[] = []
    sections.forEach((section, index) => {
      const where = (message: string) => report(`question ${index + 1} ("${section.title}"): ${message}`)
      const meta = readMeta(section.tokens[0], where)

      const listIndex = section.tokens.findIndex((token) => token.type === 'list')
      const explanationIndex = section.tokens.findIndex(
        (token) => token.type === 'heading' && (token as Tokens.Heading).depth === 3 && (token as Tokens.Heading).text.trim() === 'Explanation',
      )
      const list = section.tokens[listIndex] as Tokens.List | undefined
      if (!list || !list.items.every((item) => item.task)) {
        where('add the options as a task list: "- [ ] wrong option" and "- [x] correct option"')
        return
      }
      if (list.items.length < MIN_OPTIONS) where(`a question needs at least ${MIN_OPTIONS} options`)
      const correct = list.items.flatMap((item, i) => (item.checked ? [i] : []))
      if (correct.length !== 1) where(`mark exactly one option as correct with "- [x]" (found ${correct.length})`)
      if (explanationIndex === -1 || explanationIndex < listIndex) {
        where('add "### Explanation" after the options')
        return
      }
      if (section.tokens.length > explanationIndex + 1 && explanationIndex !== listIndex + 1) {
        where('put nothing between the options and "### Explanation"')
      }
      const explanation = section.tokens.slice(explanationIndex + 1)
      if (explanation.length === 0) where('the explanation is empty')
      if (!meta || correct.length !== 1 || list.items.length < MIN_OPTIONS || explanation.length === 0) return

      questions.push({
        id: `q${index + 1}`,
        ...meta,
        questionHtml: inlineHtml(section.title),
        promptHtml: toHtml(section.tokens.slice(1, listIndex), `Question ${index + 1}`),
        options: list.items.map((item) => ({ html: inlineHtml(item.text.replace(/^\[[ xX]\]\s*/, '').trim()) })),
        correctIndex: correct[0],
        explanationHtml: toHtml(explanation, `Question ${index + 1} explanation`),
      })
    })

    if (!fields || result.errors.length > errorsBefore) continue
    loaded.push({
      file,
      id: fields.id as string,
      title: fields.title as string,
      order: fields.order as number,
      difficulty: fields.difficulty as Level,
      topic: fields.topic as string,
      summary: fields.summary as string,
      durationMinutes: fields.duration as number,
      questions,
    })
  }

  reportDuplicates(loaded, (q) => q.id, 'quiz id', result.errors, (q) => displayPath(q.file))
  reportDuplicates(loaded, (q) => q.order, 'quiz order', result.errors, (q) => displayPath(q.file))
  result.quizzes = loaded
    .sort((a, b) => a.order - b.order)
    .map(({ file, ...quiz }) => {
      void file
      return quiz
    })
  return result
}
