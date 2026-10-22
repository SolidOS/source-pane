import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextProvider } from '@lit/context'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from 'solid-ui'

const { fetchContentAndMetadata } = vi.hoisted(() => ({
  fetchContentAndMetadata: vi.fn()
}))

vi.mock('solid-logic', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    solidLogicSingleton: {
      ...actual.solidLogicSingleton,
      resource: {
        ...actual.solidLogicSingleton.resource,
        fetchContentAndMetadata
      }
    }
  }
})

vi.mock('../src/components/source-editor-card/SourceEditorCard.ts', () => {
  class SourceEditorCard extends HTMLElement {
    beginEditing () {}
  }
  customElements.define('source-pane-source-editor-card', SourceEditorCard)
  return { default: SourceEditorCard }
})

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
  await import('../src/components/source-editor-card/SourceEditorCard.ts')
  await import('../src/components/source-provider/SourceProvider.ts')
})

describe('source-pane-source-provider', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
    fetchContentAndMetadata.mockResolvedValue({
      content: 'content one',
      metadata: { contentType: 'text/turtle', eTag: '"one"' }
    })
  })

  function createProvider () {
    const provider = document.createElement('source-pane-source-provider')
    provider.context = {
      session: {
        store: {}
      }
    }
    provider.subject = { uri: 'https://example.test/one.ttl' }
    provider.appendChild(document.createElement('source-pane-source-editor-card'))

    return provider
  }

  function createFileExplorerContext () {
    return {
      store: undefined,
      subjectUri: 'https://example.test/one.ttl',
      pane: undefined,
      isDirty: false,
      canEdit: false,
      registerEditor: vi.fn(() => vi.fn()),
      beginEditing: vi.fn(),
      setDirty: vi.fn()
    }
  }

  it('registers once when context values change but the registrar stays the same', async () => {
    const provider = createProvider()
    const context = createFileExplorerContext()
    provider.fileExplorerContext = context
    document.body.appendChild(provider)
    await flushUpdates(provider)

    expect(context.registerEditor).toHaveBeenCalledExactlyOnceWith(provider)
    const unregister = context.registerEditor.mock.results[0].value

    provider.fileExplorerContext = { ...context, canEdit: true, isDirty: true }
    provider.requestUpdate()
    await flushUpdates(provider)

    expect(context.registerEditor).toHaveBeenCalledTimes(1)
    expect(unregister).not.toHaveBeenCalled()
  })

  it('unregisters when the owning provider changes or its context is removed', async () => {
    const provider = createProvider()
    const first = createFileExplorerContext()
    const second = createFileExplorerContext()
    provider.fileExplorerContext = first
    document.body.appendChild(provider)
    await flushUpdates(provider)

    provider.fileExplorerContext = second
    provider.requestUpdate()
    await flushUpdates(provider)
    expect(first.registerEditor.mock.results[0].value).toHaveBeenCalledTimes(1)
    expect(second.registerEditor).toHaveBeenCalledExactlyOnceWith(provider)

    provider.fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT
    provider.requestUpdate()
    await flushUpdates(provider)
    expect(second.registerEditor.mock.results[0].value).toHaveBeenCalledTimes(1)
  })

  it('unregisters on disconnect and registers again on reconnect', async () => {
    const provider = createProvider()
    const context = createFileExplorerContext()
    provider.fileExplorerContext = context
    document.body.appendChild(provider)
    await flushUpdates(provider)
    const unregister = context.registerEditor.mock.results[0].value

    provider.remove()
    expect(unregister).toHaveBeenCalledTimes(1)

    document.body.appendChild(provider)
    await flushUpdates(provider)
    expect(context.registerEditor).toHaveBeenCalledTimes(2)
    expect(unregister).toHaveBeenCalledTimes(1)
  })

  it('does not register without a file explorer context', async () => {
    const provider = createProvider()
    document.body.appendChild(provider)
    await flushUpdates(provider)
    expect(provider.fileExplorerContext).toBe(DEFAULT_FILE_EXPLORER_CONTEXT)
  })

  it('consumes manager context updates without registering the editor again', async () => {
    const manager = document.createElement('div')
    const context = createFileExplorerContext()
    const contextProvider = new ContextProvider(manager, {
      context: fileExplorerContext,
      initialValue: context
    })
    const provider = createProvider()
    manager.appendChild(provider)
    document.body.appendChild(manager)
    await flushUpdates(provider)

    expect(context.registerEditor).toHaveBeenCalledExactlyOnceWith(provider)

    contextProvider.setValue({ ...context, isDirty: true, canEdit: true })
    await flushUpdates(provider)

    expect(provider.fileExplorerContext.isDirty).toBe(true)
    expect(context.registerEditor).toHaveBeenCalledTimes(1)
  })

  it('forwards the registered editing action to the editor card', async () => {
    const provider = createProvider()
    const context = createFileExplorerContext()
    provider.fileExplorerContext = context
    document.body.appendChild(provider)
    await flushUpdates(provider)
    await customElements.whenDefined('source-pane-source-editor-card')
    const card = provider.querySelector('source-pane-source-editor-card')
    const beginEditing = vi.spyOn(card, 'beginEditing').mockImplementation(() => {})

    context.registerEditor.mock.calls[0][0].beginEditing()

    expect(beginEditing).toHaveBeenCalledTimes(1)
  })

  it('queues the editing action until the editor card is appended', async () => {
    const provider = document.createElement('source-pane-source-provider')
    provider.context = {
      session: {
        store: {}
      }
    }
    provider.subject = { uri: 'https://example.test/one.ttl' }
    const context = createFileExplorerContext()
    provider.fileExplorerContext = context
    document.body.appendChild(provider)
    await flushUpdates(provider)

    context.registerEditor.mock.calls[0][0].beginEditing()
    const card = document.createElement('source-pane-source-editor-card')
    const beginEditing = vi.spyOn(card, 'beginEditing')
    provider.appendChild(card)
    await Promise.resolve()

    expect(beginEditing).toHaveBeenCalledTimes(1)
  })

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
    expect(provider.querySelector('source-pane-source-editor-card')).not.toBeNull()

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
    expect(provider.querySelector('source-pane-source-editor-card')).not.toBeNull()
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