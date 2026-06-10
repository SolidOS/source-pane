jest.mock('../src/helpers', () => ({
  fetchContentAndMetadata: jest.fn(),
  setUnedited: jest.fn(),
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

const { fetchContentAndMetadata, setUnedited } = require('../src/helpers')
const { SourceEditor } = require('../src/components/sourceEditorCard/SourceEditor')
require('../src/components/sourceEditorCard/SourceEditorCard')

describe('solid-panes-source-editor-card', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  it('renders the filename and initializes the editor with fetched content', async () => {
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
      contentType: undefined,
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

    const editorInstance = SourceEditor.mock.results[0].value
    expect(fetchContentAndMetadata).toHaveBeenCalledWith(
      card.sourceContext.context.session.store,
      expect.objectContaining({ value: card.subject.uri }),
      card.sourcePaneState,
    )
    expect(editorInstance.initialize).toHaveBeenCalled()
    expect(setUnedited).toHaveBeenCalledWith(
      expect.objectContaining({ value: card.subject.uri }),
      card.sourcePaneState,
    )
    expect(card.shadowRoot.textContent).toContain('card')
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

    expect(card.getValue()).toBe('editor value')

    card.focusEditor()
    expect(editorInstance.focusEditor).toHaveBeenCalled()

    card.setReadOnly(true)
    expect(editorInstance.setReadOnly).toHaveBeenCalledWith(true)

    card.setValue('updated')
    expect(editorInstance.replaceContent).toHaveBeenCalledWith('updated')
  })
})
