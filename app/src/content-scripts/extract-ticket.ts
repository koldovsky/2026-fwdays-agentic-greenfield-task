import { parseJiraTicket } from '../lib/jira-parser'
import { PARSE_RESULT_MESSAGE, type TicketParseMessage } from './messages'

// Injected into the active tab via chrome.scripting.executeScript under the
// activeTab grant (no host permission — NFR-04). Runs the framework-free parser
// against the live DOM (FR-02) and posts the result back to the popup.
const message: TicketParseMessage = {
  type: PARSE_RESULT_MESSAGE,
  result: parseJiraTicket(document),
}

void chrome.runtime.sendMessage(message).catch(() => {
  // Popup may have closed before the message is delivered — no listener to receive it.
})
