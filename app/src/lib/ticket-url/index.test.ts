import { describe, expect, it } from 'vitest'
import { looksLikeJiraTicketUrl } from './index'

describe('looksLikeJiraTicketUrl', () => {
  it('matches the canonical /browse/KEY-123 path (FR-04)', () => {
    expect(looksLikeJiraTicketUrl('https://jira.atlassian.com/browse/ROVODEV-36')).toBe(true)
    expect(looksLikeJiraTicketUrl('https://my-company.example.com/browse/ABC-1')).toBe(true)
  })

  it('matches a Cloud board deep link with selectedIssue', () => {
    expect(
      looksLikeJiraTicketUrl('https://acme.atlassian.net/jira/software/projects/AB/boards/1?selectedIssue=AB-42'),
    ).toBe(true)
  })

  it('matches a Cloud new-issue-view path on an atlassian.net host', () => {
    expect(looksLikeJiraTicketUrl('https://acme.atlassian.net/jira/software/projects/AB/issues/AB-42')).toBe(true)
  })

  it('rejects non-ticket pages', () => {
    expect(looksLikeJiraTicketUrl('https://jira.atlassian.com/secure/Dashboard.jspa')).toBe(false)
    expect(looksLikeJiraTicketUrl('https://github.com/some/repo')).toBe(false)
    expect(looksLikeJiraTicketUrl('https://acme.atlassian.net/wiki/spaces/DOCS/pages/123')).toBe(false)
  })

  it('rejects non-http(s) and malformed URLs', () => {
    expect(looksLikeJiraTicketUrl('chrome://extensions')).toBe(false)
    expect(looksLikeJiraTicketUrl('file:///Users/me/browse/ABC-1')).toBe(false)
    expect(looksLikeJiraTicketUrl('not a url')).toBe(false)
    expect(looksLikeJiraTicketUrl('')).toBe(false)
  })

  it('does not match lowercase keys in the browse path (Jira keys are uppercase)', () => {
    expect(looksLikeJiraTicketUrl('https://jira.atlassian.com/browse/rovodev-36')).toBe(false)
  })
})
