jest.mock('../src/helpers', () => ({
  fetchContentAndMetadata: jest.fn(),
}))

jest.mock('../src/components/sourceEditorCard/SourceEditor', () => {
  return {
    SourceEditor: jest.fn().mockImplementation(() => ({
      initialize: jest.fn(),
      getValue: jest.fn(() => 'editor value'),
      focusEditor: jest.fn(),
      setReadOnly: jest.fn(),
      replaceContent: jest.fn(),
      destroy: jest.fn(),
    })),
  }
})

const { fetchContentAndMetadata } = require('../src/helpers')
const { SourceEditor } = require('../src/components/sourceEditorCard/SourceEditor')
require('../src/components/sourceEditorCard/SourceEditorCard')

describe('solid-panes-source-editor-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  it('renders the editor controls and initializes the editor with fetched content', async () => {
    fetchContentAndMetadata.mockResolvedValue({
      content: 'hello world',
      metadata: {
        contentType: 'text/turtle',
        allowed: 'GET',
        eTag: '"123"',
      },
    })

    const card = document.createElement('solid-panes-source-editor-card')
    card.subject = {
      uri: 'https://testingsolidos.solidcommunity.net/profile/card',
      value: 'https://testingsolidos.solidcommunity.net/profile/card',
    }
    card.sourcePaneState = {
      broken: false,
      contentType: 'text/turtle',
      allowed: undefined,
      eTag: undefined,
    }
    Object.defineProperty(card, 'sourceContext', {
      value: {
        context: {
          session: {
            store: { fetcher: {} },
          },
        },
        subject: card.subject.uri,
        sourcePaneState: card.sourcePaneState,
      },
      writable: true,
    })

    document.body.appendChild(card)
    await card.updateComplete

    await new Promise((resolve) => setTimeout(resolve, 0))
    await card.updateComplete

    const editorInstance = SourceEditor.mock.results[0].value
    expect(fetchContentAndMetadata).toHaveBeenCalledWith(
      card.sourceContext.context.session.store,
      expect.objectContaining({ value: card.subject.uri }),
      card.sourcePaneState,
    )
    expect(editorInstance.initialize).toHaveBeenCalled()
    expect(card.getEditor()).toBe(editorInstance)
    expect(card.getEditor()?.getValue()).toBe('editor value')
    expect(card.shadowRoot.querySelector('.sourcePanePrettyButton')).not.toBeNull()
  })

  it('hides prettify for non-compactable content', async () => {
    fetchContentAndMetadata.mockResolvedValue({
      content: 'hello world',
      metadata: {
        contentType: 'text/plain',
        allowed: 'GET',
        eTag: '"123"',
      },
    })

    const card = document.createElement('solid-panes-source-editor-card')
    card.subject = {
      uri: 'https://testingsolidos.solidcommunity.net/profile/card.txt',
      value: 'https://testingsolidos.solidcommunity.net/profile/card.txt',
    }
    card.sourcePaneState = {
      broken: false,
      contentType: 'text/plain',
      allowed: undefined,
      eTag: undefined,
    }
    Object.defineProperty(card, 'sourceContext', {
      value: {
        context: {
          session: {
            store: { fetcher: {} },
          },
        },
        subject: card.subject.uri,
        sourcePaneState: card.sourcePaneState,
      },
      writable: true,
    })

    document.body.appendChild(card)
    await card.updateComplete
    await new Promise((resolve) => setTimeout(resolve, 0))
    await card.updateComplete

    expect(card.shadowRoot.querySelector('.sourcePanePrettyButton')).toBeNull()
  })

  it('delegates editor API methods', () => {
    const card = document.createElement('solid-panes-source-editor-card')
    const editorInstance = SourceEditor.mock.results[0]?.value ?? {
      getValue: jest.fn(() => 'editor value'),
      focusEditor: jest.fn(),
      setReadOnly: jest.fn(),
      replaceContent: jest.fn(),
    }
    card._editor = editorInstance

    card.focusEditor()
    expect(editorInstance.focusEditor).toHaveBeenCalled()

    card.setReadOnly(true)
    expect(editorInstance.setReadOnly).toHaveBeenCalledWith(true)

    card.setValue('updated')
    expect(editorInstance.replaceContent).toHaveBeenCalledWith('updated')
  })
})
