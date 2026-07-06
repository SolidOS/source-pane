import { render } from 'lit'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/components/source-editor-card/SourceEditorCard', () => {
  class MockSourceEditorCard extends HTMLElement {}

  if (!globalThis.customElements.get('solid-panes-source-editor-card')) {
    globalThis.customElements.define('solid-panes-source-editor-card', MockSourceEditorCard)
  }

  return {
    default: MockSourceEditorCard
  }
})

let canEditSource
let renderHeader

beforeAll(async () => {
  const headerModule = await import('../src/Header')
  canEditSource = headerModule.canEditSource
  renderHeader = headerModule.renderHeader
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
      dirty: false,
      editing: false,
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
      dirty: false,
      editing: false,
      allowed: undefined,
      contentType: undefined,
      eTag: undefined
    }

    const { container } = renderHeaderIntoDocument(sourcePaneState)
    const editorCard = document.createElement('solid-panes-source-editor-card')
    editorCard.updateEditingState = vi.fn()
    editorCard.setReadOnly = vi.fn()
    editorCard.focusEditor = vi.fn()
    document.body.appendChild(editorCard)

    await Promise.resolve()
    container.querySelector('.sourcePaneEditButton').click()

    expect(editorCard.updateEditingState).toHaveBeenCalledWith(true)
    expect(editorCard.setReadOnly).toHaveBeenCalledWith(false)
    expect(editorCard.focusEditor).toHaveBeenCalled()
  })

  it('allows editing only when the subject can be edited', () => {
    expect(canEditSource({ uri: 'https://janedoe.example/test.ttl' }, { allowed: undefined })).toBe(true)
    expect(canEditSource({ uri: 'https://janedoe.example/folder/' }, { allowed: 'GET,PUT' })).toBe(false)
    expect(canEditSource({ uri: 'https://janedoe.example/test.ttl' }, { allowed: 'GET' })).toBe(false)
  })
})
