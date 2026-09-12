import extractTicketScript from '../content-scripts/extract-ticket?script&iife'
import { isTicketParseMessage } from '../content-scripts/messages'
import type { ParsedTicket, ParseResult } from '../lib/jira-parser'
import { anonymizeTicket } from '../lib/anonymizer'
import { planAttachmentNames, serializeTicketToMarkdown } from '../lib/markdown-serializer'
import { buildExportPaths } from '../lib/export-naming'
import { looksLikeJiraTicketUrl } from '../lib/ticket-url'

type PopupState = 'idle' | 'progress' | 'success' | 'error'

interface AttachmentOutcome {
  fileName: string
  ok: boolean
  error?: string
}

const exportButton = document.querySelector<HTMLButtonElement>('#export-btn')!
const anonymizeCheckbox = document.querySelector<HTMLInputElement>('#anonymize')!
const ticketHint = document.querySelector<HTMLElement>('#ticket-hint')!
const errorMessage = document.querySelector<HTMLElement>('#error-message')!
const errorDetails = document.querySelector<HTMLUListElement>('#error-details')!
const successCaveats = document.querySelector<HTMLDetailsElement>('#success-caveats')!
const successCaveatsList = document.querySelector<HTMLUListElement>('#success-caveats-list')!

const EXTRACTION_TIMEOUT_MS = 15_000
const DOWNLOAD_TIMEOUT_MS = 60_000

function setState(state: PopupState): void {
  document.body.dataset['state'] = state
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  // Toolbar popups are not tabs, but Playwright opens the popup as a tab page —
  // skip extension pages so Export targets the Jira content tab behind the popup.
  const contentTab = tabs.find((tab) => tab.url !== undefined && !tab.url.startsWith('chrome-extension://'))
  return contentTab ?? tabs[0]
}

/** Injects the extraction script into the tab and awaits its posted ParseResult. */
function extractTicket(tabId: number): Promise<ParseResult> {
  return new Promise<ParseResult>((resolve, reject) => {
    const cleanup = (): void => {
      clearTimeout(timeout)
      chrome.runtime.onMessage.removeListener(listener)
    }
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for the page to be read.'))
    }, EXTRACTION_TIMEOUT_MS)

    function listener(message: unknown): void {
      if (!isTicketParseMessage(message)) return
      cleanup()
      resolve(message.result)
    }

    chrome.runtime.onMessage.addListener(listener)
    chrome.scripting
      .executeScript({ target: { tabId }, files: [extractTicketScript] })
      .catch((error: unknown) => {
        cleanup()
        reject(error instanceof Error ? error : new Error(String(error)))
      })
  })
}

/** Downloads one URL to a relative path under Downloads, resolving on completion. */
function downloadToPath(url: string, filename: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    let onChanged: (delta: chrome.downloads.DownloadDelta) => void

    const finish = (outcome: 'resolve' | 'reject', error?: Error): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      chrome.downloads.onChanged.removeListener(onChanged)
      if (outcome === 'resolve') resolve()
      else reject(error ?? new Error('Download failed.'))
    }

    const timeout = setTimeout(() => {
      finish('reject', new Error('Download timed out.'))
    }, DOWNLOAD_TIMEOUT_MS)

    chrome.downloads.download({ url, filename, conflictAction: 'uniquify', saveAs: false }, (downloadId) => {
      if (chrome.runtime.lastError !== undefined || downloadId === undefined) {
        finish('reject', new Error(chrome.runtime.lastError?.message ?? 'Download failed to start.'))
        return
      }

      onChanged = (delta: chrome.downloads.DownloadDelta): void => {
        if (delta.id !== downloadId || delta.state === undefined) return
        if (delta.state.current === 'complete') {
          finish('resolve')
        } else if (delta.state.current === 'interrupted') {
          finish('reject', new Error(delta.error?.current ?? 'Download interrupted.'))
        }
      }

      chrome.downloads.onChanged.addListener(onChanged)
    })
  })
}

function renderList(list: HTMLUListElement, items: string[]): void {
  list.replaceChildren()
  for (const item of items) {
    const li = document.createElement('li')
    li.textContent = item
    list.appendChild(li)
  }
}

function showError(message: string, failedAttachments: AttachmentOutcome[]): void {
  errorMessage.textContent = 'Export failed'
  renderList(errorDetails, [
    message,
    ...failedAttachments.map((a) => `${a.fileName} — ${a.error ?? 'download failed'}`),
  ])
  setState('error')
}

function showSuccess(failedAttachments: AttachmentOutcome[]): void {
  if (failedAttachments.length > 0) {
    renderList(successCaveatsList, failedAttachments.map((a) => `${a.fileName} — ${a.error ?? 'download failed'}`))
    successCaveats.hidden = false
  } else {
    successCaveats.hidden = true
  }
  setState('success')
}

async function downloadAttachments(
  plans: ReturnType<typeof planAttachmentNames>,
  mediaDir: string,
): Promise<AttachmentOutcome[]> {
  const outcomes: AttachmentOutcome[] = []
  for (const plan of plans) {
    try {
      await downloadToPath(plan.url, `${mediaDir}/${plan.fileName}`)
      outcomes.push({ fileName: plan.fileName, ok: true })
    } catch (error) {
      outcomes.push({ fileName: plan.fileName, ok: false, error: describeError(error) })
    }
  }
  return outcomes
}

async function runExport(): Promise<void> {
  setState('progress')

  const tab = await getActiveTab()
  if (tab?.id === undefined) {
    showError('No active tab to export from.', [])
    return
  }

  let parseResult: ParseResult
  try {
    parseResult = await extractTicket(tab.id)
  } catch (error) {
    showError(describeError(error), [])
    return
  }

  if (!parseResult.ok) {
    showError(parseResult.reason, [])
    return
  }

  let ticket: ParsedTicket = parseResult.ticket
  if (anonymizeCheckbox.checked) {
    ticket = anonymizeTicket(ticket).ticket
  }

  const plans = planAttachmentNames(ticket.attachments)
  const markdown = serializeTicketToMarkdown(ticket, plans)
  const paths = buildExportPaths(ticket)

  const blobUrl = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }))
  try {
    await downloadToPath(blobUrl, paths.mdPath)
  } catch (error) {
    showError(`Could not save the Markdown file: ${describeError(error)}`, [])
    return
  } finally {
    URL.revokeObjectURL(blobUrl)
  }

  const outcomes = await downloadAttachments(plans, paths.mediaDir)
  const parseSkips: AttachmentOutcome[] = (ticket.attachmentSkips ?? []).map((skip) => ({
    fileName: skip.name,
    ok: false,
    error: skip.reason,
  }))
  showSuccess([...outcomes.filter((outcome) => !outcome.ok), ...parseSkips])
}

async function init(): Promise<void> {
  setState('idle')
  const tab = await getActiveTab()
  const isTicket = tab?.url !== undefined && looksLikeJiraTicketUrl(tab.url)
  exportButton.disabled = !isTicket
  ticketHint.hidden = isTicket
}

exportButton.addEventListener('click', () => {
  void runExport()
})

void init()
