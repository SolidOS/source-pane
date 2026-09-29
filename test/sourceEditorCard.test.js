import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

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

    Object.defineProperty(card, 'sourceContext', {
      value: {
        originalContent: 'hello world',
        sourcePaneState: { broken: false },
        editorMetadata: {
          contentType,
          eTag: '"123"'
        },
        updateSourcePaneState: vi.fn(),
        updateMetadata: vi.fn()
      },
      writable: true
    })

    Object.defineProperty(card, 'fileExplorerContext', {
      value: {
        store: { fetcher: {} },
        subjectUri: 'https://testingsolidos.solidcommunity.net/profile/card',
        paneSupportsEditing: true,
        edit: {
          updateDirtyState: vi.fn()
        }
      },
      writable: true
    })

    return card
  }

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
})
