/**
 * Measures the daily-problem content that the size budget leaves to scripts/content-budget.json.
 *
 * Why: scripts/size-budget.json was recorded before Stage 3 with Days 1 to 90 in the app, and its
 * dist/ and offline totals cover app code plus that content. Each new 30-day batch adds roughly
 * 125 kB of text (tasks, starter data, hints, solutions, explanations), so 275 more days can never
 * fit inside +5% / +3%. As approved for Stage 3B batch 2, daily problems from Day 91 on are measured
 * here against their own cap per 30-day chunk, and are taken out of the dist/ and offline totals,
 * which stay exactly as recorded.
 *
 * Per chunk: its solution file, its 30-day problem-text file (both hold nothing but that chunk's
 * content) and the problem summaries found verbatim in the problem list. Offline, where everything
 * is one file, only text found verbatim is counted.
 *
 * Only bytes that can be found verbatim in the build are taken out, so app code can never hide
 * behind content: object keys, punctuation, expected-result cells and strings shorter than
 * MIN_FIELD_LENGTH stay counted as app bytes.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

/** Shorter strings (titles, single words) could match unrelated text, so they are never taken out. */
const MIN_FIELD_LENGTH = 40

/** The ways the build writes a content string: a template literal, or inside the offline worker's string. */
function encodings(value) {
  const template = value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
  return [...new Set([template, JSON.stringify(template).slice(1, -1), JSON.stringify(value).slice(1, -1)])]
}

function countOccurrences(text, needle) {
  let count = 0
  for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, index + needle.length)) count += 1
  return count
}

/**
 * Bytes of `fields` found in `text`. A string needed n times (the same hint in several problems)
 * is credited at most as often as it actually occurs. Returns { bytes, found, total }.
 */
function creditFields(text, fields) {
  const needed = new Map()
  for (const value of fields) {
    if (typeof value !== 'string' || value.length < MIN_FIELD_LENGTH) continue
    needed.set(value, (needed.get(value) ?? 0) + 1)
  }
  let bytes = 0
  let found = 0
  let total = 0
  for (const [value, count] of needed) {
    total += count
    for (const encoded of encodings(value)) {
      const times = Math.min(count, countOccurrences(text, encoded))
      if (times > 0) {
        bytes += Buffer.byteLength(encoded) * times
        found += times
        break
      }
    }
  }
  return { bytes, found, total }
}

const publicFields = (problem) => [problem.summary, problem.descriptionHtml, problem.starterSql, ...problem.hints, ...problem.objectives]
/** Fields that stay in the problem list every SQL Path page loads (the rest is in the 30-day text files). */
const listFields = (problem) => [problem.summary]
const solutionFields = (solution) => [solution.sql, solution.explanationHtml, ...solution.alternatives]

/**
 * @param root the app folder
 * @param firstDay the first day measured as content (from content-budget.json)
 */
export async function measureContent(root, firstDay) {
  const { loadAllContent } = await import('../plugins/content/index.ts')
  const { problemGroupId } = await import('../plugins/content/solutionGroups.ts')
  const { problemTextGroupId } = await import('../plugins/content/problemText.ts')
  const contentDir = path.join(root, 'src', 'content')
  const content = loadAllContent({
    dir: path.join(contentDir, 'modules'),
    datasetsDir: path.join(contentDir, 'datasets'),
    challengesDir: path.join(contentDir, 'challenges'),
    quizzesDir: path.join(contentDir, 'quizzes'),
  })
  const problems = content.pathProblems.filter((problem) => problem.day >= firstDay)

  const assetsDir = path.join(root, 'dist', 'assets')
  const assetFiles = readdirSync(assetsDir)
  const scripts = assetFiles.filter((file) => file.endsWith('.js'))
  const offlineHtml = path.join(root, 'dist-offline', 'index.html')
  const offlineText = existsSync(offlineHtml) ? readFileSync(offlineHtml, 'utf8') : ''

  const chunks = new Map()
  for (const problem of problems) {
    const groupId = problemGroupId(problem.pathId, problem.day)
    const chunk = chunks.get(groupId) ?? { groupId, problems: [] }
    chunk.problems.push(problem)
    chunks.set(groupId, chunk)
  }

  const results = []
  for (const chunk of chunks.values()) {
    // "virtual:sql-learner-solutions-data-analyst-days-121-150" → "_virtual_sql-learner-solutions-data-analyst-days-121-150-<hash>.js"
    const prefix = `_${chunk.groupId.replace(':', '_')}-`
    const solutionFile = assetFiles.find((file) => file.startsWith(prefix) && file.endsWith('.js'))
    const solutionFileBytes = solutionFile ? statSync(path.join(assetsDir, solutionFile)).size : 0
    const fields = chunk.problems.flatMap(publicFields)
    // The 30-day text file (task, starter query, hints, objectives) holds nothing but this chunk's
    // content, so all of it counts; the summaries in the problem list are credited where found verbatim.
    const textPrefix = `_${problemTextGroupId(chunk.problems[0].pathId, chunk.problems[0].day).replace(':', '_')}-`
    const textFile = assetFiles.find((file) => file.startsWith(textPrefix) && file.endsWith('.js'))
    const textFileBytes = textFile ? statSync(path.join(assetsDir, textFile)).size : 0
    let publicCredit = { bytes: 0, found: 0, total: 0 }
    for (const file of scripts) {
      if (file === solutionFile || file === textFile) continue
      const credit = creditFields(readFileSync(path.join(assetsDir, file), 'utf8'), textFile ? chunk.problems.flatMap(listFields) : fields)
      if (credit.bytes > publicCredit.bytes) publicCredit = credit
    }
    const offlineCredit = creditFields(offlineText, [
      ...fields,
      ...chunk.problems.flatMap((problem) => solutionFields(content.solutions[problem.id])),
    ])
    results.push({
      groupId: chunk.groupId,
      days: [chunk.problems[0].day, chunk.problems[chunk.problems.length - 1].day],
      problemCount: chunk.problems.length,
      solutionFile,
      solutionFileBytes,
      textFile,
      publicBytes: textFileBytes + publicCredit.bytes,
      publicFound: `${publicCredit.found}/${publicCredit.total}`,
      chunkBytes: solutionFileBytes + textFileBytes + publicCredit.bytes,
      offlineBytes: offlineCredit.bytes,
      offlineFound: `${offlineCredit.found}/${offlineCredit.total}`,
    })
  }
  return results.sort((a, b) => a.days[0] - b.days[0])
}
