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

const totalOk = current.distTotalBytes <= budget.distTotal.limitBytes
rows.push(`${totalOk ? 'ok  ' : 'OVER'} ${'dist/ total'.padEnd(46)} ${String(budget.distTotal.baselineBytes).padStart(10)} → ${String(current.distTotalBytes).padStart(10)} bytes (limit +${budget.distTotal.limitPercent}%)`)
if (!totalOk) failures.push(`dist/ is ${current.distTotalBytes} bytes, over its limit of ${budget.distTotal.limitBytes}`)

const htmlOk = current.offline.indexHtmlBytes <= budget.offlineIndexHtml.limitBytes
rows.push(`${htmlOk ? 'ok  ' : 'OVER'} ${'dist-offline/index.html'.padEnd(46)} ${String(budget.offlineIndexHtml.baselineBytes).padStart(10)} → ${String(current.offline.indexHtmlBytes).padStart(10)} bytes (limit +${budget.offlineIndexHtml.limitPercent}%)`)
if (!htmlOk) failures.push(`dist-offline/index.html is ${current.offline.indexHtmlBytes} bytes, over its limit of ${budget.offlineIndexHtml.limitBytes}`)

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
