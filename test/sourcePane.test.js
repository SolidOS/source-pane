import { render } from 'lit'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let renderHeader

beforeAll(async () => {
  class MockSourceEditorCard extends HTMLElement {
    constructor () {
      super()
      this.updateEditingState = vi.fn()
      this.setReadOnly = vi.fn()
      this.focusEditor = vi.fn()
    }
  }

  if (!globalThis.customElements.get('source-pane-source-editor-card')) {
    globalThis.customElements.define('source-pane-source-editor-card', MockSourceEditorCard)
  }

  const headerModule = await import('../src/Header.ts')
  renderHeader = headerModule.renderHeader

  await import('../src/components/header/SourceHeader.ts')
})

function renderHeaderIntoDocument (sourcePaneState) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const store = { findTypeURIs: vi.fn(() => ({})) }
  const subject = { uri: 'https://janedoe.example/test.ttl' }
  render(renderHeader(store, subject, sourcePaneState), container)

  return { container, subject, store }
}

describe('source-pane', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders the header edit control', async () => {
    const sourcePaneState = {
      broken: false,
      editing: false,
      readonly: false,
      allowed: undefined,
      contentType: undefined,
      eTag: undefined
    }

    const { container } = renderHeaderIntoDocument(sourcePaneState)
    await Promise.resolve()

    expect(container.querySelector('header.sourcePaneHeader')).not.toBeNull()
    expect(container.querySelector('.sourcePaneEditButton')).not.toBeNull()
  })

  it('activates the editor when edit is clicked', async () => {
    const sourcePaneState = {
      broken: false,
      editing: false,
      readonly: false,
      allowed: undefined,
      contentType: undefined,
      eTag: undefined
    }

    const { container } = renderHeaderIntoDocument(sourcePaneState)
    const editorCard = document.createElement('source-pane-source-editor-card')
    document.body.appendChild(editorCard)

    await Promise.resolve()
    container.querySelector('.sourcePaneEditButton').click()

    expect(editorCard.updateEditingState).toHaveBeenCalledWith(true)
    expect(editorCard.setReadOnly).toHaveBeenCalledWith(false)
    expect(editorCard.focusEditor).toHaveBeenCalled()
  })

  it('opens the editor card from the migrated header even without setEditing', async () => {
    const header = document.createElement('source-pane-source-header')
    Object.defineProperty(header, 'sourceContext', {
      value: {
        sourcePaneState: {
          broken: false
        }
      },
      writable: true
    })

    const editorCard = document.createElement('source-pane-source-editor-card')
    document.body.appendChild(header)
    document.body.appendChild(editorCard)

    await header.updateComplete
    await Promise.resolve()

    header.shadowRoot.querySelectorAll('solid-ui-button')[1].click()

    expect(editorCard.updateEditingState).toHaveBeenCalledWith(true)
    expect(editorCard.setReadOnly).toHaveBeenCalledWith(false)
    expect(editorCard.focusEditor).toHaveBeenCalled()
  })
})
