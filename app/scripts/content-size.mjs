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
 * content) and the problem summaries found verbatim in the problem list.
 *
 * Offline, where everything is one file, the same content modules are counted whole: each module's
 * literal (its complete exported value, from the dist file) must be found exactly once in
 * dist-offline/index.html, or the check fails. The summaries, which live in modules shared with
 * other content, are then credited where found verbatim in the rest of the file (see measureOffline).
 *
 * Only bytes that can be found verbatim in the build are taken out, so app code can never hide
 * behind content: object keys, punctuation, expected-result cells and strings shorter than
 * MIN_FIELD_LENGTH stay counted as app bytes.
 *
 * SQL Path projects (Workstream 2) are measured the same way, per project, against their own cap
 * (projectLimitBytes): the project's text file, its solution file and its dataset file (all three hold
 * nothing but that project's content), plus its summaries found verbatim in the path content.
 * Offline, its three modules are counted whole and its summaries where found verbatim, as above.
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
      // Counted offline by measureOffline: the modules whole, the summaries where found verbatim.
      moduleFiles: [solutionFile, textFile].filter(Boolean),
      summaryFields: chunk.problems.flatMap(listFields),
    })
  }
  return results.sort((a, b) => a.days[0] - b.days[0])
}

const projectSummaryFields = (summary) => [summary.summary, ...summary.milestones.map((milestone) => milestone.goal), ...summary.tasks.map((task) => task.summary)]

/** Measures each written SQL Path project. */
export async function measureProjects(root) {
  const { loadAllContent } = await import('../plugins/content/index.ts')
  const { projectGroupId } = await import('../plugins/content/solutionGroups.ts')
  const { projectTextId } = await import('../plugins/content/projectText.ts')
  const contentDir = path.join(root, 'src', 'content')
  const content = loadAllContent({
    dir: path.join(contentDir, 'modules'),
    datasetsDir: path.join(contentDir, 'datasets'),
    challengesDir: path.join(contentDir, 'challenges'),
    quizzesDir: path.join(contentDir, 'quizzes'),
  })
  const assetsDir = path.join(root, 'dist', 'assets')
  const assetFiles = readdirSync(assetsDir)
  const scripts = assetFiles.filter((file) => file.endsWith('.js'))
  const fileFor = (prefix) => assetFiles.find((file) => file.startsWith(prefix) && file.endsWith('.js') && /^-[A-Za-z0-9_-]{8}\.js$/.test(file.slice(prefix.length - 1)))
  const sizeOf = (file) => (file ? statSync(path.join(assetsDir, file)).size : 0)

  // A dataset file is shared by every project that uses it, so it is counted once, with its first project.
  const countedDatasets = new Set()
  const results = []
  for (const { summary, text } of content.pathProjects) {
    const textFile = fileFor(`_${projectTextId(summary.pathId, summary.id).replace(':', '_')}-`)
    const solutionFile = fileFor(`_${projectGroupId(summary.pathId, summary.id).replace(':', '_')}-`)
    const datasetFile = countedDatasets.has(summary.dataset) ? undefined : fileFor(`${summary.dataset}-`)
    countedDatasets.add(summary.dataset)
    let summaryCredit = { bytes: 0, found: 0, total: 0 }
    for (const file of scripts) {
      if (file === textFile || file === solutionFile || file === datasetFile) continue
      const credit = creditFields(readFileSync(path.join(assetsDir, file), 'utf8'), projectSummaryFields(summary))
      if (credit.bytes > summaryCredit.bytes) summaryCredit = credit
    }
    const textBytes = sizeOf(textFile)
    const solutionBytes = sizeOf(solutionFile)
    const datasetBytes = sizeOf(datasetFile)
    results.push({
      id: `${summary.pathId}/${summary.id}`,
      taskCount: summary.tasks.length,
      textFile,
      solutionFile,
      datasetFile,
      textBytes,
      solutionBytes,
      datasetBytes,
      summaryBytes: summaryCredit.bytes,
      summaryFound: `${summaryCredit.found}/${summaryCredit.total}`,
      projectBytes: textBytes + solutionBytes + datasetBytes + summaryCredit.bytes,
      // Counted offline by measureOffline: the modules whole, the summaries where found verbatim.
      moduleFiles: [textFile, solutionFile, datasetFile].filter(Boolean),
      summaryFields: projectSummaryFields(summary),
    })
  }
  return results
}

/**
 * The complete exported value of a content module, as the dist file writes it: everything between
 * "const e=" (or var/let) and ";export{". A content module holds nothing else.
 */
export function moduleLiteral(code) {
  const start = /^(?:const|var|let) [\w$]+=/.exec(code)
  const end = code.lastIndexOf(';export{')
  if (!start || end <= start[0].length) return undefined
  return code.slice(start[0].length, end)
}

/**
 * Counts budgeted content in dist-offline/index.html, per item (a 30-day chunk or a project).
 *
 * Each of an item's module files is counted whole: its literal must occur exactly once in the offline
 * file, written as in the dist file or escaped inside a string (the offline build embeds the worker,
 * which holds the solutions and datasets, as a template literal). A literal
 * found zero or several times is reported in `failures`, so a change in how the offline build writes
 * content can never quietly shrink or inflate the credit. Literals already counted are then taken out
 * of the text, and each item's summaries (strings of MIN_FIELD_LENGTH or more) are credited where found
 * verbatim in what is left.
 *
 * @param items [{ moduleFiles: string[], summaryFields: string[] }]
 * @returns { results: [{ moduleBytes, summaryBytes, offlineBytes, summaryFound }], failures: string[] }
 */
export function measureOffline(root, items) {
  const assetsDir = path.join(root, 'dist', 'assets')
  const offlineHtml = path.join(root, 'dist-offline', 'index.html')
  const failures = []
  if (!existsSync(offlineHtml)) return { results: items.map(() => ({ moduleBytes: 0, summaryBytes: 0, offlineBytes: 0, summaryFound: '0/0' })), failures: ['dist-offline/index.html is missing'] }
  const offlineText = readFileSync(offlineHtml, 'utf8')
  const ranges = []
  const moduleBytes = items.map((item) => {
    let bytes = 0
    for (const file of item.moduleFiles) {
      const literal = moduleLiteral(readFileSync(path.join(assetsDir, file), 'utf8'))
      if (!literal) {
        failures.push(`${file} is not a content module (no "const e=…;export{")`)
        continue
      }
      const counts = [...new Set([literal, ...encodings(literal)])].map((encoded) => ({ encoded, times: countOccurrences(offlineText, encoded) }))
      const found = counts.filter((entry) => entry.times > 0)
      if (found.length !== 1 || found[0].times !== 1) {
        const times = counts.reduce((sum, entry) => sum + entry.times, 0)
        failures.push(`${file}: its content was found ${times} times in dist-offline/index.html (expected exactly once)`)
        continue
      }
      const start = offlineText.indexOf(found[0].encoded)
      ranges.push([start, start + found[0].encoded.length])
      bytes += Buffer.byteLength(found[0].encoded)
    }
    return bytes
  })
  ranges.sort((a, b) => a[0] - b[0])
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index][0] < ranges[index - 1][1]) failures.push('Two content modules overlap in dist-offline/index.html')
  }
  let rest = ''
  let at = 0
  for (const [start, end] of ranges) {
    rest += offlineText.slice(at, start) + '\u0000'
    at = end
  }
  rest += offlineText.slice(at)
  const results = items.map((item, index) => {
    const credit = creditFields(rest, item.summaryFields)
    return {
      moduleBytes: moduleBytes[index],
      summaryBytes: credit.bytes,
      offlineBytes: moduleBytes[index] + credit.bytes,
      summaryFound: `${credit.found}/${credit.total}`,
    }
  })
  return { results, failures }
}
