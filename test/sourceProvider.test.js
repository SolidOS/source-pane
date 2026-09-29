import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchContentAndMetadata = vi.fn()

vi.mock('../src/resourceLoader.ts', () => ({
  fetchContentAndMetadata
}))

function deferred () {
  let resolve
  let reject

  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

async function flushUpdates (element) {
  await element.updateComplete
  await Promise.resolve()
  await element.updateComplete
}

beforeAll(async () => {
  await import('../src/components/source-provider/SourceProvider.ts')
})

describe('source-pane-source-provider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  function createProvider () {
    const provider = document.createElement('source-pane-source-provider')
    provider.context = {
      session: {
        store: {}
      }
    }
    provider.subject = { uri: 'https://example.test/one.ttl' }

    return provider
  }

  it('reloads when subject changes and re-renders after the new async load', async () => {
    const secondLoad = deferred()

    fetchContentAndMetadata
      .mockResolvedValueOnce({
        content: 'content one',
        metadata: { contentType: 'text/turtle', eTag: '"one"' }
      })
      .mockImplementationOnce(() => secondLoad.promise)

    const provider = createProvider()
    document.body.appendChild(provider)

    await flushUpdates(provider)
    expect(provider.originalContent).toBe('content one')
    expect(provider.editorMetadata).toEqual({ contentType: 'text/turtle', eTag: '"one"' })
    expect(provider.shadowRoot.querySelector('source-pane-source-editor-card')).not.toBeNull()

    provider.subject = { uri: 'https://example.test/two.txt' }
    await provider.updateComplete
    expect(provider.dataLoaded).toBe(false)

    secondLoad.resolve({
      content: 'content two',
      metadata: { contentType: 'text/plain', eTag: '"two"' }
    })
    await flushUpdates(provider)
    expect(provider.originalContent).toBe('content two')
    expect(provider.editorMetadata).toEqual({ contentType: 'text/plain', eTag: '"two"' })
    expect(provider.shadowRoot.querySelector('source-pane-source-editor-card')).not.toBeNull()
  })

  it('ignores stale loads that finish after a newer subject load', async () => {
    const firstLoad = deferred()
    const secondLoad = deferred()

    fetchContentAndMetadata
      .mockImplementationOnce(() => firstLoad.promise)
      .mockImplementationOnce(() => secondLoad.promise)

    const provider = createProvider()
    document.body.appendChild(provider)

    await provider.updateComplete
    expect(fetchContentAndMetadata).toHaveBeenCalledTimes(1)

    provider.subject = { uri: 'https://example.test/two.txt' }
    await provider.updateComplete
    expect(fetchContentAndMetadata).toHaveBeenCalledTimes(2)

    secondLoad.resolve({
      content: 'fresh content',
      metadata: { contentType: 'text/plain', eTag: '"fresh"' }
    })
    await flushUpdates(provider)

    expect(provider.originalContent).toBe('fresh content')
    expect(provider.editorMetadata).toEqual({ contentType: 'text/plain', eTag: '"fresh"' })

    firstLoad.resolve({
      content: 'stale content',
      metadata: { contentType: 'text/turtle', eTag: '"stale"' }
    })
    await flushUpdates(provider)

    expect(provider.originalContent).toBe('fresh content')
    expect(provider.editorMetadata).toEqual({ contentType: 'text/plain', eTag: '"fresh"' })
  })
})