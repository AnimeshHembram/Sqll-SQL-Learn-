/**
 * Measures the production and offline builds and checks them against the size
 * budget in scripts/size-budget.json.
 *
 *   npm run build
 *   npm run measure:build                  compare with the budget (fails if over)
 *   node scripts/measure-build.mjs --write-budget
 *                                          record the current build as the baseline
 *
 * Files are matched by name without Vite's content hash, so
 * "index-GJsZoOBg.js" and a later "index-Ab12Cd34.js" are the same output.
 * --write-budget refuses to replace an existing budget unless --force is given:
 * the budget is the approved baseline, recorded once before Phase 0 changes.
 *
 * Daily problems from Day 91 on (added after the baseline) are measured against
 * scripts/content-budget.json instead, per 30-day chunk, and taken out of the
 * dist/ and offline totals; see scripts/content-size.mjs.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const root = fileURLToPath(new URL('..', import.meta.url))
const distAssets = path.join(root, 'dist', 'assets')
const distDir = path.join(root, 'dist')
const offlineDir = path.join(root, 'dist-offline')
const budgetFile = path.join(root, 'scripts', 'size-budget.json')

/** Outputs with their own limit, as approved in the Phase 0 checklist (percent above baseline). */
const LIMITS = {
  'index.js': 2,
  'useSqlEngine.js': 3,
  'ChallengePage.js': 5,
  '_virtual_sql-learner-challenge-solutions.js': 5,
  'sql.worker.js': 15,
}
const DIST_TOTAL_LIMIT = 5
const OFFLINE_HTML_LIMIT = 3

/** "index-GJsZoOBg.js" → "index.js". Vite's hash is the 8 characters before the extension. */
function logicalName(file) {
  const match = /^(.*)-[A-Za-z0-9_-]{8}(\.[A-Za-z0-9]+)$/.exec(file)
  return match ? `${match[1]}${match[2]}` : file
}

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(full) : [full]
  })
}

function measure() {
  if (!existsSync(distAssets) || !existsSync(offlineDir)) {
    console.error('No build found. Run npm run build first.')
    process.exit(1)
  }
  const assets = {}
  for (const file of readdirSync(distAssets).sort()) {
    const full = path.join(distAssets, file)
    const name = logicalName(file)
    if (assets[name]) {
      console.error(`Two build files share the name ${name} (${assets[name].file} and ${file}). Measure a clean build.`)
      process.exit(1)
    }
    assets[name] = { file, bytes: statSync(full).size, gzipBytes: gzipSync(readFileSync(full)).length }
  }
  const distTotal = filesUnder(distDir).reduce((sum, file) => sum + statSync(file).size, 0)
  const offlineFiles = readdirSync(offlineDir).sort()
  const offlineHtml = path.join(offlineDir, 'index.html')
  return {
    assets,
    distTotalBytes: distTotal,
    offline: {
      files: offlineFiles,
      totalBytes: filesUnder(offlineDir).reduce((sum, file) => sum + statSync(file).size, 0),
      indexHtmlBytes: existsSync(offlineHtml) ? statSync(offlineHtml).size : 0,
    },
  }
}

const limitFor = (bytes, percent) => Math.floor(bytes * (1 + percent / 100))
const kb = (bytes) => `${(bytes / 1000).toFixed(2)} kB`

const current = measure()
const args = process.argv.slice(2)

if (args.includes('--write-budget')) {
  if (existsSync(budgetFile) && !args.includes('--force')) {
    console.error('scripts/size-budget.json already exists. It is the approved baseline; use --force only for an approved change.')
    process.exit(1)
  }
  for (const name of Object.keys(LIMITS)) {
    if (!current.assets[name]) {
      console.error(`The build has no ${name}, so the budget cannot be recorded.`)
      process.exit(1)
    }
  }
  const budget = {
    note: 'Baseline sizes recorded from the build before Phase 0 changes, with the approved limits.',
    recordedAt: new Date().toISOString(),
    node: process.version,
    assets: Object.fromEntries(
      Object.entries(LIMITS).map(([name, percent]) => {
        const { bytes } = current.assets[name]
        return [name, { baselineBytes: bytes, limitPercent: percent, limitBytes: limitFor(bytes, percent) }]
      }),
    ),
    allBaselineAssets: Object.fromEntries(Object.entries(current.assets).map(([name, { bytes, gzipBytes }]) => [name, { bytes, gzipBytes }])),
    distTotal: { baselineBytes: current.distTotalBytes, limitPercent: DIST_TOTAL_LIMIT, limitBytes: limitFor(current.distTotalBytes, DIST_TOTAL_LIMIT) },
    offlineIndexHtml: {
      baselineBytes: current.offline.indexHtmlBytes,
      limitPercent: OFFLINE_HTML_LIMIT,
      limitBytes: limitFor(current.offline.indexHtmlBytes, OFFLINE_HTML_LIMIT),
    },
    offlineFiles: current.offline.files,
  }
  writeFileSync(budgetFile, `${JSON.stringify(budget, null, 2)}\n`)
  console.log('Recorded scripts/size-budget.json:')
  for (const [name, entry] of Object.entries(budget.assets)) console.log(`  ${name.padEnd(46)} ${kb(entry.baselineBytes)}  limit ${kb(entry.limitBytes)} (+${entry.limitPercent}%)`)
  console.log(`  dist/ total                                    ${current.distTotalBytes} bytes  limit ${budget.distTotal.limitBytes}`)
  console.log(`  dist-offline/index.html                        ${current.offline.indexHtmlBytes} bytes  limit ${budget.offlineIndexHtml.limitBytes}`)
  console.log(`  dist-offline/ files                            ${current.offline.files.join(', ')}`)
  process.exit(0)
}

if (!existsSync(budgetFile)) {
  console.error('No scripts/size-budget.json yet. Record it with: node scripts/measure-build.mjs --write-budget')
  process.exit(1)
}
const budget = JSON.parse(readFileSync(budgetFile, 'utf8'))
const failures = []
const rows = []

// Daily problems added after the baseline have their own budget (scripts/content-budget.json) and are
// taken out of the dist/ and offline totals below. The limits in size-budget.json are unchanged.
const contentBudgetFile = path.join(root, 'scripts', 'content-budget.json')
let contentChunks = []
if (existsSync(contentBudgetFile)) {
  const contentBudget = JSON.parse(readFileSync(contentBudgetFile, 'utf8'))
  const { measureContent } = await import('./content-size.mjs')
  contentChunks = await measureContent(root, contentBudget.firstDay)
  for (const chunk of contentChunks) {
    const label = `content: days ${chunk.days.join('-')} (${chunk.problemCount} problems)`
    const ok = chunk.chunkBytes <= contentBudget.chunkLimitBytes && chunk.solutionFile
    rows.push(`${ok ? 'ok  ' : 'OVER'} ${label.padEnd(46)} ${kb(chunk.chunkBytes).padStart(10)}  limit ${kb(contentBudget.chunkLimitBytes)} (solutions ${kb(chunk.solutionFileBytes)}, page text ${kb(chunk.publicBytes)})`)
    if (!chunk.solutionFile) failures.push(`${chunk.groupId} has no solution chunk in dist/assets`)
    else if (!ok) failures.push(`${label} is ${chunk.chunkBytes} bytes, over its limit of ${contentBudget.chunkLimitBytes}`)
  }
}
const distContentBytes = contentChunks.reduce((sum, chunk) => sum + chunk.chunkBytes, 0)
const offlineContentBytes = contentChunks.reduce((sum, chunk) => sum + chunk.offlineBytes, 0)
const distAppBytes = current.distTotalBytes - distContentBytes
const offlineAppBytes = current.offline.indexHtmlBytes - offlineContentBytes

for (const [name, entry] of Object.entries(budget.assets)) {
  const now = current.assets[name]
  if (!now) {
    failures.push(`${name} is missing from the build`)
    continue
  }
  const change = ((now.bytes - entry.baselineBytes) / entry.baselineBytes) * 100
  const ok = now.bytes <= entry.limitBytes
  rows.push(`${ok ? 'ok  ' : 'OVER'} ${name.padEnd(46)} ${kb(entry.baselineBytes).padStart(10)} → ${kb(now.bytes).padStart(10)}  ${change >= 0 ? '+' : ''}${change.toFixed(2)}% (limit +${entry.limitPercent}%)`)
  if (!ok) failures.push(`${name} is ${now.bytes} bytes, over its limit of ${entry.limitBytes}`)
}

const withoutContent = (bytes, total) => (bytes === total ? '' : ` (${total} with Day ${contentChunks[0].days[0]}+ content)`)
const totalOk = distAppBytes <= budget.distTotal.limitBytes
rows.push(`${totalOk ? 'ok  ' : 'OVER'} ${'dist/ total'.padEnd(46)} ${String(budget.distTotal.baselineBytes).padStart(10)} → ${String(distAppBytes).padStart(10)} bytes (limit +${budget.distTotal.limitPercent}%)${withoutContent(distAppBytes, current.distTotalBytes)}`)
if (!totalOk) failures.push(`dist/ is ${distAppBytes} bytes without budgeted content, over its limit of ${budget.distTotal.limitBytes}`)

const htmlOk = offlineAppBytes <= budget.offlineIndexHtml.limitBytes
rows.push(`${htmlOk ? 'ok  ' : 'OVER'} ${'dist-offline/index.html'.padEnd(46)} ${String(budget.offlineIndexHtml.baselineBytes).padStart(10)} → ${String(offlineAppBytes).padStart(10)} bytes (limit +${budget.offlineIndexHtml.limitPercent}%)${withoutContent(offlineAppBytes, current.offline.indexHtmlBytes)}`)
if (!htmlOk) failures.push(`dist-offline/index.html is ${offlineAppBytes} bytes without budgeted content, over its limit of ${budget.offlineIndexHtml.limitBytes}`)

const sameFiles = JSON.stringify(current.offline.files) === JSON.stringify(budget.offlineFiles)
rows.push(`${sameFiles ? 'ok  ' : 'DIFF'} ${'dist-offline/ files'.padEnd(46)} ${current.offline.files.join(', ')}`)
if (!sameFiles) failures.push(`dist-offline/ holds ${current.offline.files.join(', ')}; expected ${budget.offlineFiles.join(', ')}`)

const added = Object.keys(current.assets).filter((name) => !(name in budget.allBaselineAssets))
const removed = Object.keys(budget.allBaselineAssets).filter((name) => !(name in current.assets))
if (added.length > 0) rows.push(`note new build files (counted in dist/ total): ${added.join(', ')}`)
if (removed.length > 0) rows.push(`note build files no longer produced: ${removed.join(', ')}`)

console.log(rows.join('\n'))
if (failures.length > 0) {
  console.error(`\nBuild size check failed:\n  - ${failures.join('\n  - ')}`)
  process.exit(1)
}
console.log('\nBuild sizes are within the budget.')
