// The frame's init-handshake origin guard (ADR-013, modern-web-guidance §1.5). This is the ONLY origin
// check on the reader-frame side — it decides whether to accept the transferred MessagePort. Getting it
// wrong (or fail-open) would let any page hand the frame a port, so it is pinned here.

import { describe, expect, it } from 'vitest'
import { READER_INIT, shouldAcceptInit } from './protocol'

const APP_ORIGIN = 'http://localhost:5173'
const init = { type: READER_INIT }

describe('shouldAcceptInit', () => {
  it('accepts the init message from the configured app origin', () => {
    expect(shouldAcceptInit(APP_ORIGIN, init, APP_ORIGIN)).toBe(true)
  })

  it('rejects a handshake from any other origin (the credential-holding app could be impersonated)', () => {
    expect(shouldAcceptInit('http://evil.test', init, APP_ORIGIN)).toBe(false)
    expect(shouldAcceptInit('http://localhost:5175', init, APP_ORIGIN)).toBe(false)
    expect(shouldAcceptInit('null', init, APP_ORIGIN)).toBe(false)
  })

  it('FAILS CLOSED when the app origin is unconfigured — accepts nothing', () => {
    expect(shouldAcceptInit(APP_ORIGIN, init, undefined)).toBe(false)
    expect(shouldAcceptInit(APP_ORIGIN, init, '')).toBe(false)
  })

  it('rejects a right-origin message that is not the init message', () => {
    expect(shouldAcceptInit(APP_ORIGIN, { type: 'open' }, APP_ORIGIN)).toBe(false)
    expect(shouldAcceptInit(APP_ORIGIN, null, APP_ORIGIN)).toBe(false)
    expect(shouldAcceptInit(APP_ORIGIN, 'edda:reader-frame:init', APP_ORIGIN)).toBe(false)
  })
})
