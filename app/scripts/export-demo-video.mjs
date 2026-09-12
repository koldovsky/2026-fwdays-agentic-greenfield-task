import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const resultsDir = path.join(appRoot, 'test-results')
const demoDir = path.join(appRoot, 'demo')
const outPath = path.join(demoDir, 'ticket2md-export.webm')

function findWebms(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findWebms(entryPath))
    else if (entry.name.endsWith('.webm')) found.push(entryPath)
  }
  return found
}

if (!fs.existsSync(resultsDir)) {
  console.error('No test-results/ directory. Run "npm run test:e2e" first.')
  process.exit(1)
}

const webms = findWebms(resultsDir)
if (webms.length === 0) {
  console.error('No .webm found under test-results/. Ensure recordVideo is set on launchPersistentContext.')
  process.exit(1)
}

// Playwright records one .webm per page tab; pick the largest (most visual content).
webms.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)
const source = webms[0]
fs.mkdirSync(demoDir, { recursive: true })
fs.copyFileSync(source, outPath)
console.log(`Demo video copied to ${outPath} (from ${path.basename(source)}, ${(fs.statSync(outPath).size / 1024).toFixed(0)} KiB)`)
if (webms.length > 1) {
  console.log(`Other page recordings (${webms.length - 1}): ${webms.slice(1).map((p) => path.basename(p)).join(', ')}`)
  console.log('For a fuller demo, trim/combine in a video editor or re-record with macOS screen capture.')
}
console.log('Trim to 1–2 min for the homework submission.')
