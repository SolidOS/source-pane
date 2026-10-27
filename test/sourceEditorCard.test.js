import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextProvider } from '@lit/context'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'
import { sourceContext } from '../src/primitives/context'

const { initializeEditor } = vi.hoisted(() => ({ initializeEditor: vi.fn(async () => {}) }))

vi.mock('solid-ui', async importOriginal => ({
  ...await importOriginal(),
  CodeEditor: class {
    initialize = initializeEditor
    setReadOnly () {}
    destroy () {}
  }
}))

function deferred () {
  let resolve
  const promise = new Promise(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

beforeAll(async () => {
  await import('../src/components/source-editor-card/SourceEditorCard.ts')
})

describe('source-pane-source-editor-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  function createCard ({ contentType = 'text/turtle' } = {}) {
    const card = document.createElement('source-pane-source-editor-card')

    card.sourceContext = {
      dataLoaded: true,
      resourceUri: 'https://testingsolidos.solidcommunity.net/profile/card',
      originalContent: 'hello world',
      sourcePaneState: { broken: false },
      editorMetadata: {
        contentType,
        eTag: '"123"'
      },
      updateSourcePaneState: vi.fn(),
      updateContent: vi.fn(),
      updateMetadata: vi.fn()
    }

    card.fileExplorerContext = {
      store: { fetcher: {} },
      subjectUri: 'https://testingsolidos.solidcommunity.net/profile/card',
      pane: undefined,
      isDirty: false,
      canEdit: true,
      registerEditor: vi.fn(() => vi.fn()),
      beginEditing: vi.fn(),
      setDirty: vi.fn()
    }

    return card
  }

  it('initializes after subscribed source content arrives, not just on firstUpdated', async () => {
    const manager = document.createElement('div')
    const values = createCard()
    const source = new ContextProvider(manager, {
      context: sourceContext,
      initialValue: { ...values.sourceContext, dataLoaded: false }
    })
    new ContextProvider(manager, {
      context: fileExplorerContext,
      initialValue: values.fileExplorerContext
    })
    const card = document.createElement('source-pane-source-editor-card')
    manager.append(card)
    document.body.append(manager)
    await card.updateComplete
    expect(initializeEditor).not.toHaveBeenCalled()

    source.setValue(values.sourceContext)

    await vi.waitFor(() => expect(initializeEditor).toHaveBeenCalledOnce())
    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePaneCardLoading')).toBeNull()
  })

  it('waits safely for file explorer context and retries when it arrives later', async () => {
    const manager = document.createElement('div')
    const values = createCard()
    new ContextProvider(manager, { context: sourceContext, initialValue: values.sourceContext })
    const explorer = new ContextProvider(manager, { context: fileExplorerContext, initialValue: DEFAULT_FILE_EXPLORER_CONTEXT })
    const card = document.createElement('source-pane-source-editor-card')
    manager.append(card)
    document.body.append(manager)
    await card.updateComplete
    expect(initializeEditor).not.toHaveBeenCalled()

    explorer.setValue(values.fileExplorerContext)

    await vi.waitFor(() => expect(initializeEditor).toHaveBeenCalledOnce())
    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePaneCardLoading')).toBeNull()
  })

  it('shows prettify when not editing and content is compactable', async () => {
    const card = createCard({ contentType: 'text/turtle' })
    document.body.appendChild(card)

    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePanePrettyButton')).not.toBeNull()
  })

  it('hides prettify for non-compactable content', async () => {
    const card = createCard({ contentType: 'text/plain' })
    document.body.appendChild(card)

    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePanePrettyButton')).toBeNull()
  })

  it('delegates editor API methods and toggles editing controls', async () => {
    const card = createCard({ contentType: 'text/turtle' })
    const editor = {
      focusEditor: vi.fn(),
      setReadOnly: vi.fn(),
      replaceContent: vi.fn(),
      resetDirtyState: vi.fn(),
      setLanguage: vi.fn(async () => {}),
      getValue: vi.fn(() => 'updated'),
      destroy: vi.fn()
    }

    card._editor = editor
    card._editorReady = true
    document.body.appendChild(card)

    await card.updateComplete

    card.focusEditor()
    expect(editor.focusEditor).toHaveBeenCalled()

    card.setReadOnly(true)
    expect(editor.setReadOnly).toHaveBeenCalledWith(true)

    card.setValue('updated')
    expect(editor.replaceContent).toHaveBeenCalledWith('updated')

    card.beginEditing()
    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).not.toBeNull()
    expect(card.shadowRoot.querySelector('.sourcePaneCancelButton')).not.toBeNull()
  })

  it('updates editor content and MIME type when the selected resource changes', async () => {
    const card = createCard({ contentType: 'text/turtle' })
    const editor = {
      focusEditor: vi.fn(),
      setReadOnly: vi.fn(),
      replaceContent: vi.fn(),
      resetDirtyState: vi.fn(),
      setLanguage: vi.fn(async () => {}),
      destroy: vi.fn()
    }
    card._editor = editor
    card._loadedResourceUri = 'https://testingsolidos.solidcommunity.net/profile/card'
    card.sourceContext = {
      ...card.sourceContext,
      resourceUri: 'https://testingsolidos.solidcommunity.net/profile/notes.txt',
      originalContent: 'plain text',
      editorMetadata: { contentType: 'text/plain', eTag: '"456"' }
    }

    await card.updated(new Map([['sourceContext', undefined]]))

    expect(editor.setLanguage).toHaveBeenCalledWith('text/plain')
    expect(editor.replaceContent).toHaveBeenCalledWith('plain text')
    expect(card.getOriginalContent()).toBe('plain text')
  })

  it('refreshes retained editor content after a same-resource reload', async () => {
    const card = createCard()
    const editor = {
      setReadOnly: vi.fn(),
      replaceContent: vi.fn(),
      resetDirtyState: vi.fn(),
      setLanguage: vi.fn(async () => {}),
      destroy: vi.fn()
    }
    card._editor = editor
    card._loadedResourceUri = card.sourceContext.resourceUri

    card.sourceContext = {
      ...card.sourceContext,
      dataLoaded: false
    }
    await card.updated(new Map([['sourceContext', undefined]]))
    expect(card._loadedResourceUri).toBeUndefined()

    card.sourceContext = {
      ...card.sourceContext,
      dataLoaded: true,
      originalContent: 'fresh content',
      editorMetadata: { contentType: 'text/plain', eTag: '"456"' }
    }
    await card.updated(new Map([['sourceContext', undefined]]))

    expect(editor.replaceContent).toHaveBeenCalledWith('fresh content')
    expect(card.getOriginalContent()).toBe('fresh content')
  })

  it('leaves editing mode when synchronizing a new resource', async () => {
    const card = createCard()
    const editor = {
      setReadOnly: vi.fn(),
      replaceContent: vi.fn(),
      resetDirtyState: vi.fn(),
      setLanguage: vi.fn(async () => {}),
      destroy: vi.fn()
    }
    card._editor = editor
    card._loadedResourceUri = 'https://example.test/one.ttl'
    card._isEditing = true
    card.sourceContext = {
      ...card.sourceContext,
      resourceUri: 'https://example.test/two.txt',
      originalContent: 'new content',
      editorMetadata: { contentType: 'text/plain', eTag: '"456"' }
    }

    await card.updated(new Map([['sourceContext', undefined]]))

    expect(card._isEditing).toBe(false)
    expect(editor.setReadOnly).toHaveBeenCalledWith(true)
  })

  it('does not apply an older synchronization after a newer one starts', async () => {
    const firstLanguage = deferred()
    const secondLanguage = deferred()
    const card = createCard()
    const editor = {
      setReadOnly: vi.fn(),
      replaceContent: vi.fn(),
      resetDirtyState: vi.fn(),
      setLanguage: vi.fn()
        .mockImplementationOnce(() => firstLanguage.promise)
        .mockImplementationOnce(() => secondLanguage.promise),
      destroy: vi.fn()
    }
    card._editor = editor
    card._loadedResourceUri = card.sourceContext.resourceUri

    card.sourceContext = {
      ...card.sourceContext,
      resourceUri: 'https://example.test/two.txt',
      originalContent: 'content two',
      editorMetadata: { contentType: 'text/plain', eTag: '"two"' }
    }
    const firstUpdate = card.updated(new Map([['sourceContext', undefined]]))

    card.sourceContext = {
      ...card.sourceContext,
      resourceUri: 'https://example.test/three.json',
      originalContent: 'content three',
      editorMetadata: { contentType: 'application/json', eTag: '"three"' }
    }
    const secondUpdate = card.updated(new Map([['sourceContext', undefined]]))

    firstLanguage.resolve()
    await firstUpdate
    secondLanguage.resolve()
    await secondUpdate

    expect(editor.replaceContent).toHaveBeenCalledTimes(1)
    expect(editor.replaceContent).toHaveBeenCalledWith('content three')
  })

  it('finalizes a successful save when metadata refresh fails', async () => {
    const webOperation = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    const fetchMetadata = vi.spyOn(solidLogicSingleton.resource, 'fetchMetadata')
      .mockRejectedValueOnce(new Error('metadata unavailable'))
    const card = createCard({ contentType: 'text/plain' })
    const editor = {
      focusEditor: vi.fn(),
      setReadOnly: vi.fn(),
      replaceContent: vi.fn(),
      resetDirtyState: vi.fn(),
      setLanguage: vi.fn(async () => {}),
      getValue: vi.fn(() => 'updated'),
      destroy: vi.fn()
    }
    card._editor = editor
    card._editorReady = true
    card.fileExplorerContext = {
      ...card.fileExplorerContext,
      store: {
        fetcher: {
          webOperation,
          load: vi.fn(async () => {})
        }
      }
    }
    document.body.appendChild(card)
    card.beginEditing()
    await card.updateComplete

    await card.saveBack()

    expect(webOperation).toHaveBeenNthCalledWith(
      1,
      'PUT',
      card.fileExplorerContext.subjectUri,
      expect.objectContaining({ data: 'updated' })
    )
    expect(fetchMetadata).toHaveBeenCalledOnce()
    expect(card.sourceContext.updateContent).toHaveBeenCalledWith('updated')
    expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).toBeNull()
    fetchMetadata.mockRestore()
  })
})
