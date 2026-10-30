import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { ChallengeSolution, ContentChallenge, ContentTable, Level } from '../../src/content/types.ts'
import { FEEDBACK_KINDS, type FeedbackKind } from '../../src/features/challenges/evaluate.ts'
import {
  checkMarkdown,
  inlineHtml,
  readFields,
  reportDuplicates,
  splitSections,
  tableFromToken,
  toHtml,
  type FieldSpec,
  type Section,
} from './fields.ts'
import { parseFrontMatter } from './frontMatter.ts'
import { displayPath } from './loadContent.ts'
import { markdown, type Token, type Tokens } from './markdown.ts'

/**
 * Reads every challenge file in `challengesDir` (see src/content/AUTHORING.md),
 * validates it and splits it into a public part, bundled with the app, and a
 * hidden part (solution, expected result, explanation) that is only built into
 * the database worker and the chunk loaded when the learner reveals the solution.
 */

export interface WrongAnswer {
  /** The feedback the evaluator must give for this query. */
  kind: FeedbackKind
  sql: string
}

export interface ChallengeLoadResult {
  challenges: ContentChallenge[]
  solutions: Record<string, ChallengeSolution>
  /** Author-only test cases used by npm run check; never bundled. */
  wrongAnswers: Record<string, WrongAnswer[]>
  /** Challenge id → source file, for messages. */
  sourceFiles: Record<string, string>
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
  module: { kind: 'id', optional: true },
  duration: { kind: 'positiveInteger' },
  dataset: { kind: 'id' },
  tables: { kind: 'list' },
  orderMatters: { kind: 'boolean' },
  checkColumnNames: { kind: 'boolean' },
  objectives: { kind: 'list' },
  prerequisites: { kind: 'list', optional: true },
}

const REQUIRED = ['Task', 'Starter query', 'Hints', 'Solution', 'Expected result', 'Explanation'] as const
const OPTIONAL = ['Other accepted answers', 'Wrong answers'] as const
const SECTIONS: readonly string[] = [...REQUIRED, ...OPTIONAL]

/** Hints are progressive, so a challenge needs at least two. */
const MIN_HINTS = 2

function codeBlocks(section: Section): Tokens.Code[] {
  return section.tokens.filter((token): token is Tokens.Code => token.type === 'code')
}

function onlySqlBlock(section: Section, report: (message: string) => void): string | null {
  const blocks = codeBlocks(section)
  if (blocks.length !== 1 || section.tokens.length !== 1 || blocks[0].lang?.trim() !== 'sql') {
    report(`"## ${section.title}" must contain exactly one \`\`\`sql code block and nothing else`)
    return null
  }
  return blocks[0].text
}

function readWrongAnswers(section: Section, report: (message: string) => void): WrongAnswer[] {
  // Pairs of: a "Feedback: <kind>" paragraph, then a ```sql block.
  const answers: WrongAnswer[] = []
  for (let i = 0; i < section.tokens.length; i += 2) {
    const label = section.tokens[i]
    const code = section.tokens[i + 1]
    const match = label?.type === 'paragraph' ? /^Feedback:\s*([a-z-]+)$/.exec((label as Tokens.Paragraph).text.trim()) : null
    if (!match || code?.type !== 'code' || (code as Tokens.Code).lang?.trim() !== 'sql') {
      report('"## Wrong answers" must be pairs of a "Feedback: <kind>" line followed by a ```sql code block')
      return answers
    }
    if (!(FEEDBACK_KINDS as readonly string[]).includes(match[1]) || match[1] === 'correct') {
      report(`"Feedback: ${match[1]}" is not a wrong-answer kind (use one of: ${FEEDBACK_KINDS.filter((k) => k !== 'correct').join(', ')})`)
      continue
    }
    answers.push({ kind: match[1] as FeedbackKind, sql: (code as Tokens.Code).text })
  }
  return answers
}

export function loadChallenges(
  challengesDir: string,
  datasetsDir: string,
  moduleIds: ReadonlySet<string>,
): ChallengeLoadResult {
  const result: ChallengeLoadResult = { challenges: [], solutions: {}, wrongAnswers: {}, sourceFiles: {}, errors: [], files: [] }
  if (!existsSync(challengesDir)) {
    result.errors.push(`challenges folder not found: ${displayPath(challengesDir)}`)
    return result
  }

  const loaded: (ContentChallenge & { file: string })[] = []

  for (const name of readdirSync(challengesDir).sort()) {
    const file = path.join(challengesDir, name)
    if (!name.endsWith('.md')) {
      result.errors.push(`${displayPath(file)}: unsupported file; only .md files are allowed in the challenges folder`)
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
    const { intro, sections } = splitSections(tokens)
    if (intro.length > 0) report('put all content under "##" sections (the first section is "## Task")')
    const byTitle = new Map<string, Section>()
    for (const section of sections) {
      if (!SECTIONS.includes(section.title)) report(`unknown section "## ${section.title}" (allowed: ${SECTIONS.join(', ')})`)
      else if (byTitle.has(section.title)) report(`section "## ${section.title}" appears more than once`)
      else byTitle.set(section.title, section)
    }
    for (const title of REQUIRED) {
      if (!byTitle.has(title)) report(`missing required section "## ${title}"`)
    }

    const task = byTitle.get('Task')
    const explanation = byTitle.get('Explanation')
    for (const section of [task, explanation]) {
      if (!section) continue
      if (section.tokens.length === 0) report(`"## ${section.title}" is empty`)
      checkMarkdown(section.tokens, report, ['sql', 'sql syntax'])
    }

    const starter = byTitle.get('Starter query')
    const starterSql = starter ? onlySqlBlock(starter, report) : null
    const solutionSection = byTitle.get('Solution')
    const solutionSql = solutionSection ? onlySqlBlock(solutionSection, report) : null

    let hints: string[] = []
    const hintSection = byTitle.get('Hints')
    if (hintSection) {
      const list = hintSection.tokens[0] as Tokens.List | undefined
      if (hintSection.tokens.length !== 1 || list?.type !== 'list' || !list.ordered) {
        report('"## Hints" must be a single numbered list (1. 2. 3.), from the gentlest hint to the most specific')
      } else if (list.items.length < MIN_HINTS) {
        report(`"## Hints" needs at least ${MIN_HINTS} hints so they can be shown one at a time`)
      } else {
        checkMarkdown(hintSection.tokens, report, [])
        hints = list.items.map((item) => inlineHtml(item.text.trim()))
      }
    }

    let expected: ContentTable | null = null
    const expectedSection = byTitle.get('Expected result')
    if (expectedSection) {
      const table = expectedSection.tokens[0]
      if (expectedSection.tokens.length !== 1 || table?.type !== 'table') {
        report('"## Expected result" must contain exactly one table: the reference query\'s result')
      } else {
        expected = tableFromToken(table as Tokens.Table)
      }
    }

    const alternatives: string[] = []
    const others = byTitle.get('Other accepted answers')
    if (others) {
      const blocks = codeBlocks(others)
      if (blocks.length === 0 || blocks.length !== others.tokens.length || blocks.some((block) => block.lang?.trim() !== 'sql')) {
        report('"## Other accepted answers" must contain only ```sql code blocks')
      } else {
        alternatives.push(...blocks.map((block) => block.text))
      }
    }
    const wrongSection = byTitle.get('Wrong answers')
    const wrongAnswers = wrongSection ? readWrongAnswers(wrongSection, report) : []

    if (fields) {
      const moduleId = (fields.module as string | undefined) ?? null
      if (moduleId && !moduleIds.has(moduleId)) report(`module "${moduleId}" does not exist`)
      const dataset = fields.dataset as string
      const datasetFile = path.join(datasetsDir, `${dataset}.sql`)
      if (existsSync(datasetFile)) result.files.push(datasetFile)
      else report(`dataset "${dataset}" not found; expected ${displayPath(datasetFile)}`)
    }

    if (!fields || result.errors.length > errorsBefore) continue
    if (!task || !explanation || starterSql === null || solutionSql === null || !expected) continue

    const id = fields.id as string
    const evaluation = { orderMatters: fields.orderMatters as boolean, checkColumnNames: fields.checkColumnNames as boolean }
    loaded.push({
      file,
      id,
      title: fields.title as string,
      order: fields.order as number,
      difficulty: fields.difficulty as Level,
      topic: fields.topic as string,
      summary: fields.summary as string,
      moduleId: (fields.module as string | undefined) ?? null,
      durationMinutes: fields.duration as number,
      dataset: fields.dataset as string,
      tables: fields.tables as string[],
      objectives: fields.objectives as string[],
      prerequisites: (fields.prerequisites as string[] | undefined) ?? [],
      descriptionHtml: toHtml(task.tokens as Token[], 'Task'),
      starterSql,
      hints,
      evaluation,
    })
    result.solutions[id] = {
      sql: solutionSql,
      expected,
      explanationHtml: toHtml(explanation.tokens as Token[], 'Explanation'),
      alternatives,
      evaluation,
    }
    result.wrongAnswers[id] = wrongAnswers
    result.sourceFiles[id] = file
  }

  reportDuplicates(loaded, (c) => c.id, 'challenge id', result.errors, (c) => displayPath(c.file))
  reportDuplicates(loaded, (c) => c.order, 'challenge order', result.errors, (c) => displayPath(c.file))

  result.challenges = loaded
    .sort((a, b) => a.order - b.order)
    .map(({ file, ...challenge }) => {
      void file
      return challenge
    })
  return result
}
