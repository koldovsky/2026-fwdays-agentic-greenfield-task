import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FIXTURE_HTML_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../examples/[ROVODEV-36] Gitlab SaaS integration with Rovo Dev - Create and track feature requests for Atlassian products..html',
)

export const FIXTURE_TICKET_KEY = 'ROVODEV-36'

export interface FixtureServer {
  ticketUrl: string
  close: () => Promise<void>
}

/** Serves the saved ROVODEV-36 HTML at `/browse/ROVODEV-36` for deterministic E2E. */
export function startFixtureServer(): Promise<FixtureServer> {
  const html = fs.readFileSync(FIXTURE_HTML_PATH, 'utf8')

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url?.startsWith('/browse/')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(html)
        return
      }
      res.writeHead(404).end()
    })

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address === null || typeof address === 'string') {
        server.close()
        reject(new Error('Could not bind fixture server.'))
        return
      }
      resolve({
        ticketUrl: `http://127.0.0.1:${address.port}/browse/${FIXTURE_TICKET_KEY}`,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()))
          }),
      })
    })
  })
}
