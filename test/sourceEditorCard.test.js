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
    setAccessibility () {}
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
    const section = card.shadowRoot.querySelector('section')
    expect(section?.getAttribute('role')).toBe('region')
    expect(section?.getAttribute('aria-label'))
      .toBe('Source editor for https://testingsolidos.solidcommunity.net/profile/card')
    expect(section?.getAttribute('aria-busy')).toBe('false')
    expect(initializeEditor.mock.calls[0][5]).toEqual({
      label: 'Source editor for https://testingsolidos.solidcommunity.net/profile/card',
      description: 'Source content. This content is read-only until Edit is selected.'
    })
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

  it('clears loading state when editor initialization fails', async () => {
    initializeEditor.mockRejectedValueOnce(new Error('editor unavailable'))
    const manager = document.createElement('div')
    const values = createCard()
    new ContextProvider(manager, { context: sourceContext, initialValue: values.sourceContext })
    new ContextProvider(manager, { context: fileExplorerContext, initialValue: values.fileExplorerContext })
    const card = document.createElement('source-pane-source-editor-card')
    manager.append(card)
    document.body.append(manager)

    await vi.waitFor(() => expect(card._editorError).toBe(true))
    await card.updateComplete

    const section = card.shadowRoot.querySelector('section')
    expect(section?.getAttribute('aria-busy')).toBe('false')
    expect(card.shadowRoot.querySelector('.sourcePaneStatus solid-ui-error-state')).not.toBeNull()
  })

  it('keeps the loading status available without exposing stale editor controls', async () => {
    const card = createCard()
    card._editorReady = false
    document.body.appendChild(card)

    await card.updateComplete

    const section = card.shadowRoot.querySelector('section')
    expect(section?.classList.contains('sourcePaneCardLoading')).toBe(true)
    expect(section?.getAttribute('aria-busy')).toBe('true')
    expect(card.shadowRoot.querySelector('[role="status"]')?.textContent?.trim())
      .toBe('Loading source editor')
    expect(card.shadowRoot.querySelector('.sourcePaneEditor')).not.toBeNull()
    expect(card.shadowRoot.querySelector('.sourcePaneEditorFooter')).not.toBeNull()
  })

  it('shows prettify when not editing and content is compactable', async () => {
    const card = createCard({ contentType: 'text/turtle' })
    document.body.appendChild(card)

    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePanePrettyButton')).not.toBeNull()
  })

  it('hides prettify for non-compactable content', async () => {
    const card = createCard({ contentType: 'text/plain' })
    const sourcePane = document.createElement('div')
    sourcePane.className = 'sourcePane'
    sourcePane.appendChild(card)
    document.body.appendChild(sourcePane)

    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePanePrettyButton')).toBeNull()
  })

  it('delegates editor API methods and toggles editing controls', async () => {
    const card = createCard({ contentType: 'text/turtle' })
    const editor = {
      focusEditor: vi.fn(),
      setAccessibility: vi.fn(),
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
    expect(editor.setAccessibility).toHaveBeenLastCalledWith({
      label: 'Source editor for https://testingsolidos.solidcommunity.net/profile/card',
      description: 'Source content. This content is read-only until Edit is selected.'
    })

    card.setValue('updated')
    expect(editor.replaceContent).toHaveBeenCalledWith('updated')

    card.beginEditing()
    await card.updateComplete
    expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).not.toBeNull()
    expect(card.shadowRoot.querySelector('.sourcePaneCancelButton')).not.toBeNull()

    await card.cancelHandler()
    expect(editor.focusEditor).toHaveBeenCalled()
  })

  it('updates editor content and MIME type when the selected resource changes', async () => {
    const card = createCard({ contentType: 'text/turtle' })
    const editor = {
      focusEditor: vi.fn(),
      setAccessibility: vi.fn(),
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
    expect(editor.setAccessibility).toHaveBeenCalledWith({
      label: 'Source editor for https://testingsolidos.solidcommunity.net/profile/notes.txt',
      description: 'Source content. This content is read-only until Edit is selected.'
    })

  })

    it('keeps editing controls and draft content during viewport updates and clears resize protection on Cancel', async () => {
      const card = createCard({ contentType: 'text/plain' })
      const pane = document.createElement('div')
      pane.className = 'sourcePane'
      pane.append(card)
      document.body.append(pane)
      await vi.waitFor(() => expect(card._editorReady).toBe(true))
      const editor = {
        focusEditor: vi.fn(),
        setReadOnly: vi.fn(),
        setLanguage: vi.fn(async () => {}),
        replaceContent: vi.fn(),
        resetDirtyState: vi.fn(),
        getValue: vi.fn(() => 'unsaved draft'),
        destroy: vi.fn()
      }
      card._editor = editor
      card.beginEditing()
      await card.updateComplete

      for (const width of [320, 1280, 600]) {
        pane.style.width = `${width}px`
        window.dispatchEvent(new Event('resize'))
        card.requestUpdate()
        await card.updateComplete
        expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).not.toBeNull()
        expect(card.shadowRoot.querySelector('.sourcePaneCancelButton')).not.toBeNull()
        expect(pane.getAttribute('data-preserve-pane-on-resize')).toBe('true')
        expect(card.getEditor()).toBe(editor)
        expect(card.getEditor().getValue()).toBe('unsaved draft')
      }
      expect(editor.replaceContent).not.toHaveBeenCalled()
      expect(editor.destroy).not.toHaveBeenCalled()

      await card.cancelHandler()
      await card.updateComplete
      expect(pane.hasAttribute('data-preserve-pane-on-resize')).toBe(false)
      expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).toBeNull()
      expect(card.shadowRoot.querySelector('.sourcePaneCancelButton')).toBeNull()
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

  it.each(['success', 'metadata failure', 'PUT failure', 'conflict', 'syntax error'])(
    'handles a save with %s using the inline status area',
    async outcome => {
    const fetchMetadata = vi.spyOn(solidLogicSingleton.resource, 'fetchMetadata')
      .mockResolvedValue({ contentType: 'text/plain', eTag: '"updated"' })
    if (outcome === 'metadata failure') {
      fetchMetadata.mockRejectedValueOnce(new Error('metadata unavailable'))
    }
    const webOperation = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
    if (outcome === 'PUT failure') {
      webOperation.mockReset().mockRejectedValueOnce(new Error('network unavailable'))
    } else if (outcome === 'conflict') {
      webOperation.mockReset().mockResolvedValueOnce({ ok: false, status: 412 })
    }
    const card = createCard({ contentType: outcome === 'syntax error' ? 'application/json' : 'text/plain' })
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
    const sourcePane = document.createElement('div')
    sourcePane.className = 'sourcePane'
    sourcePane.appendChild(card)
    document.body.appendChild(sourcePane)
    await card.updateComplete
    await card._syncQueue
    card.beginEditing()
    await card.updateComplete

    await card.saveBack()

    const status = card.shadowRoot.querySelector('.sourcePaneStatus')
    expect(status.previousElementSibling.className).toBe('sourcePaneEditor')
    if (outcome === 'success' || outcome === 'metadata failure') {
      expect(webOperation).toHaveBeenNthCalledWith(1, 'PUT', card.fileExplorerContext.subjectUri, {
        data: 'updated',
        contentType: 'text/plain',
        headers: { 'if-match': '"123"' }
      })
      expect(webOperation).toHaveBeenNthCalledWith(2, 'HEAD', card.fileExplorerContext.subjectUri)
      expect(fetchMetadata).toHaveBeenCalledOnce()
      expect(card.sourceContext.updateContent).toHaveBeenCalledWith('updated')
      await card.updateComplete
      expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).toBeNull()
      expect(sourcePane.hasAttribute('data-preserve-pane-on-resize')).toBe(false)
    } else {
      expect(card.sourceContext.updateContent).not.toHaveBeenCalled()
      expect(fetchMetadata).not.toHaveBeenCalled()
      expect(status.nextElementSibling.className).toBe('sourcePaneEditorFooter')
      expect(card.shadowRoot.querySelector('.sourcePaneSaveButton')).not.toBeNull()
      expect(card.shadowRoot.querySelector('.sourcePaneCancelButton')).not.toBeNull()
    }
    if (outcome === 'success') {
      expect(status.querySelector('solid-ui-error-state')).toBeNull()
      expect(status.dataset.visible).toBe('false')
      expect(card.sourceContext.updateMetadata).toHaveBeenCalledWith({
        contentType: 'text/plain', eTag: '"updated"'
      })
    } else {
      const errorState = status.querySelector('solid-ui-error-state')
      expect(errorState).not.toBeNull()
      const message = errorState.getAttribute('message')
      if (outcome === 'metadata failure') expect(message).toContain('Saved, but failed to refresh metadata')
      if (outcome === 'PUT failure') expect(message).toContain('network unavailable')
      if (outcome === 'conflict') expect(message).toContain('File changed by someone else')
      if (outcome === 'syntax error') {
        expect(webOperation).not.toHaveBeenCalled()
        expect(message).not.toBe('Syntax error: fix the document before saving.')
      }
    }
    expect(card.shadowRoot.querySelector('.sourcePaneStatusMessage')).toBeNull()
    if (outcome === 'PUT failure' || outcome === 'conflict') {
      webOperation.mockReset().mockResolvedValue({ ok: true, status: 200 })
      await card.saveBack()
      expect(card.sourceContext.updateContent).toHaveBeenCalledWith('updated')
      expect(status.querySelector('solid-ui-error-state')).toBeNull()
      expect(status.dataset.visible).toBe('false')
    }
    fetchMetadata.mockRestore()
  })
})
