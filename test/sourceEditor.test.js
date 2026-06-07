jest.mock('@codemirror/state', () => {
  class Compartment {
    of(value) {
      return { type: 'compartment-of', value }
    }

    reconfigure(value) {
      return { type: 'reconfigure', value }
    }
  }

  const EditorState = {
    create: jest.fn((config) => ({ ...config }))
  }

  return { Compartment, EditorState }
})

const createdViews = []

jest.mock('@codemirror/view', () => {
  class EditorView {
    constructor({ state, parent }) {
      this.state = state
      this.parent = parent
      this.dom = globalThis.document.createElement('div')
      this.dispatch = jest.fn((transaction) => {
        this.lastTransaction = transaction
        if (transaction.changes) {
          this.state.doc = transaction.changes.insert
        }
      })
      this.focus = jest.fn()
      this.destroy = jest.fn()
      createdViews.push(this)
      if (parent) {
        parent.appendChild(this.dom)
      }
    }
  }

  EditorView.editable = {
    of: jest.fn((value) => ({ type: 'editable', value }))
  }
  EditorView.theme = jest.fn((spec, options) => ({ type: 'theme', spec, options }))
  EditorView.lineWrapping = { type: 'lineWrapping' }
  EditorView.updateListener = {
    of: jest.fn((listener) => ({ type: 'updateListener', listener }))
  }

  return {
    EditorView,
    drawSelection: jest.fn(() => ({ type: 'drawSelection' })),
    keymap: {
      of: jest.fn((value) => ({ type: 'keymap', value }))
    },
    lineNumbers: jest.fn(() => ({ type: 'lineNumbers' }))
  }
})

jest.mock('@codemirror/language', () => ({
  defaultHighlightStyle: { name: 'defaultHighlightStyle' },
  syntaxHighlighting: jest.fn((style, options) => ({ type: 'syntaxHighlighting', style, options })),
  HighlightStyle: {
    define: jest.fn(() => ({ type: 'highlightStyle' }))
  },
  StreamLanguage: class {
    static define(mode) {
      return { type: 'stream-language', mode }
    }
  }
}))

jest.mock('@codemirror/commands', () => ({
  defaultKeymap: [{ key: 'default' }],
  history: jest.fn(() => ({ type: 'history' })),
  historyKeymap: [{ key: 'history' }]
}))

jest.mock('@codemirror/theme-one-dark', () => ({
  oneDark: { name: 'oneDark' }
}))

const { SourceEditor } = require('../src/components/sourceEditor/SourceEditor')

describe('SourceEditor', () => {
  beforeEach(() => {
    createdViews.length = 0
    document.body.innerHTML = ''
    jest.clearAllMocks()
  })

  it('initializes with the provided document text', async () => {
    const editor = new SourceEditor()
    const container = document.createElement('div')
    document.body.appendChild(container)

    await editor.initialize(container, 'hello world', 'text/plain')

    expect(editor.getValue()).toBe('hello world')
    expect(createdViews).toHaveLength(1)
    expect(createdViews[0].state.doc).toBe('hello world')
    expect(createdViews[0].parent).toBe(container)
  })

  it('replaces content and toggles read only state', async () => {
    const editor = new SourceEditor()
    const container = document.createElement('div')
    document.body.appendChild(container)

    await editor.initialize(container, 'first', 'text/plain')
    const view = createdViews[0]

    editor.replaceContent('second')
    expect(editor.getValue()).toBe('second')
    expect(view.dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 5, insert: 'second' }
    })

    editor.setReadOnly(true)
    expect(view.dispatch).toHaveBeenLastCalledWith({
      effects: { type: 'reconfigure', value: { type: 'editable', value: false } }
    })

    editor.focusEditor()
    expect(view.focus).toHaveBeenCalled()
  })
})
