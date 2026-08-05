import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchContentAndMetadata, getResponseMetadata } from '../src/resourceLoader.ts'

describe('resourceLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads response headers into metadata', () => {
    const response = {
      headers: {
        get: vi.fn((name) => {
          if (name === 'content-type') return 'text/turtle; charset=utf-8'
          if (name === 'wac-allow') return 'user="write", public="read"'
          if (name === 'etag') return '"abc"'
          return null
        })
      }
    }
    const store = {
      each: vi.fn(),
      any: vi.fn(),
      anyValue: vi.fn(() => undefined),
      sym: vi.fn()
    }
    const subject = { uri: 'https://example.org/profile/card' }

    expect(getResponseMetadata(store, subject, response)).toEqual({
      contentType: 'text/turtle',
      eTag: '"abc"'
    })
  })

  it('fetches content and applies the returned metadata', async () => {
    const response = {
      ok: true,
      headers: {
        get: vi.fn((name) => {
          if (name === 'content-type') return 'text/turtle'
          if (name === 'wac-allow') return 'user="write", public="read"'
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
      anyValue: vi.fn(() => undefined),
      sym: vi.fn()
    }
    const subject = { uri: 'https://example.org/profile/card' }

    const result = await fetchContentAndMetadata(store, subject)

    expect(result).toEqual({
      content: '<> a <#Thing>.',
      metadata: {
        contentType: 'text/turtle',
        eTag: '"abc"'
      }
    })
  })
})
