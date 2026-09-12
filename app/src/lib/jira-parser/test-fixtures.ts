import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { JSDOM } from 'jsdom'

const ROVODEV_36_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../examples/[ROVODEV-36] Gitlab SaaS integration with Rovo Dev - Create and track feature requests for Atlassian products..html',
)

export function loadRovodev36Document(): Document {
  const html = readFileSync(ROVODEV_36_PATH, 'utf-8')
  return new JSDOM(html).window.document
}

export function parseFragment(html: string): Document {
  return new JSDOM(html).window.document
}
