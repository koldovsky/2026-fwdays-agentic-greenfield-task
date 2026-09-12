const TICKET_KEY_ANYWHERE = /[A-Z][A-Z0-9]+-\d+/
const BROWSE_PATH = /\/browse\/[A-Z][A-Z0-9]+-\d+/
const CLOUD_ISSUE_PATH = /\/[A-Z][A-Z0-9]+-\d+(?:\/|$)/

/**
 * Cheap, pure heuristic for "does this tab look like a Jira ticket page?" (FR-04).
 * Used only to enable/disable Export on popup open; the authoritative check is the
 * real DOM parse at export time. Framework-free and unit-testable (NFR-07).
 */
export function looksLikeJiraTicketUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false

  // Canonical Jira ticket path on Server, Data Center and Cloud.
  if (BROWSE_PATH.test(url.pathname)) return true

  // Jira Cloud board/backlog deep links carry the issue key in a query param.
  const selected = url.searchParams.get('selectedIssue')
  if (selected !== null && TICKET_KEY_ANYWHERE.test(selected)) return true

  // Jira Cloud new issue view: /jira/.../issues/KEY-123 on an Atlassian host.
  if (/\.atlassian\.net$/.test(url.hostname) && CLOUD_ISSUE_PATH.test(url.pathname)) return true

  return false
}
