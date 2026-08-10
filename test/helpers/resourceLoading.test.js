import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchContentAndMetadata, fetchMetadata } from '../../src/components/source-provider/resourceLoading'
import { mockWebOperationOnceIf, subject, context } from './setup'

describe('resourceLoading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads content and metadata from the provided store', async () => {
    mockWebOperationOnceIf(subject.uri, {
      body: 'hello world',
      headers: {
        'content-type': 'text/turtle; charset=utf-8',
        etag: '"abc"'
      }
    })

    const result = await fetchContentAndMetadata(context.session.store, subject)

    expect(result.content).toBe('hello world')
    expect(result.metadata).toEqual({
      contentType: 'text/turtle',
      eTag: '"abc"'
    })
  })

  it('loads metadata from the provided store', async () => {
    mockWebOperationOnceIf(subject.uri, {
      body: '',
      headers: {
        'content-type': 'text/plain',
        etag: '"etag-1"'
      }
    })

    const result = await fetchMetadata(context.session.store, subject)

    expect(result).toEqual({
      contentType: 'text/plain',
      eTag: '"etag-1"'
    })
  })
})