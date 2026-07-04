import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchContentAndMetadata, getResponseHeaders } from '../src/helpers.ts'

describe('helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads response headers into metadata', () => {
    const response = {
      headers: {
        get: vi.fn((name) => {
          if (name === 'content-type') return 'text/turtle; charset=utf-8'
          if (name === 'allow') return 'GET,PUT'
          if (name === 'etag') return '"abc"'
          return null
        })
      }
    }
    const store = { each: vi.fn(), any: vi.fn(), anyValue: vi.fn(), sym: vi.fn() }
    const subject = { uri: 'https://example.org/profile/card' }

    expect(getResponseHeaders(store, subject, response)).toEqual({
      contentType: 'text/turtle',
      allowed: 'GET,PUT',
      eTag: '"abc"'
    })
  })

  it('fetches content and applies the returned metadata', async () => {
    const response = {
      ok: true,
      headers: {
        get: vi.fn((name) => {
          if (name === 'content-type') return 'text/turtle'
          if (name === 'allow') return 'GET,PUT'
          if (name === 'etag') return '"abc"'
          return null
        })
      },
      responseText: '<> a <#Thing>.'
    }
    const store = {
      fetcher: {
        webOperation: vi.fn().mockResolvedValue(response)
      },
      each: vi.fn(),
      any: vi.fn(),
      anyValue: vi.fn(),
      sym: vi.fn()
    }
    const subject = { uri: 'https://example.org/profile/card' }
    const sourcePaneState = { broken: false, contentType: undefined, allowed: undefined, eTag: undefined }

    const result = await fetchContentAndMetadata(store, subject, sourcePaneState)

    expect(result).toEqual({
      content: '<> a <#Thing>.',
      metadata: {
        contentType: 'text/turtle',
        allowed: 'GET,PUT',
        eTag: '"abc"'
      }
    })
    expect(sourcePaneState).toEqual({
      broken: false,
      contentType: 'text/turtle',
      allowed: 'GET,PUT',
      eTag: '"abc"'
    })
  })
})
