import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextProvider } from '@lit/context'
import type { LitElement } from 'lit'
import { LiveStore } from 'rdflib'
import { fileExplorerContext } from 'solid-ui'
import { axe } from 'vitest-axe'
import { getStatusSection } from '../src/StatusSection'
import type SourceEditorCard from '../src/components/source-editor-card/SourceEditorCard'
import { sourceContext } from '../src/primitives/context'

const { initializeEditor } = vi.hoisted(() => ({ initializeEditor: vi.fn(async () => {}) }))

vi.mock('solid-ui', async importOriginal => ({
  ...await importOriginal(),
  CodeEditor: class {
    initialize = initializeEditor
    focusEditor () {}
    setAccessibility () {}
    setReadOnly () {}
    destroy () {}
  }
}))

beforeAll(async () => {
  await import('../src/components/source-editor-card/SourceEditorCard')
})

beforeEach(() => {
  vi.clearAllMocks()
})

const activeManagers: HTMLElement[] = []

afterEach(() => {
  for (const manager of activeManagers.splice(0)) {
    manager.remove()
  }
})

function createEditorCard () {
  const card = document.createElement('source-pane-source-editor-card') as SourceEditorCard
  const source = {
    dataLoaded: true,
    resourceUri: 'https://example.test/notes.ttl',
    originalContent: '@prefix schema: <https://schema.org/> .',
    sourcePaneState: { broken: false },
    editorMetadata: { contentType: 'text/turtle', eTag: '"123"' },
    updateSourcePaneState: vi.fn(),
    updateContent: vi.fn(),
    updateMetadata: vi.fn()
  }
  const explorer = {
    store: new LiveStore([]),
    subjectUri: source.resourceUri,
    pane: undefined,
    isDirty: false,
    canEdit: true,
    registerEditor: vi.fn(() => vi.fn()),
    beginEditing: vi.fn(),
    setDirty: vi.fn()
  }

  const manager = document.createElement('div')
  new ContextProvider(manager, { context: sourceContext, initialValue: source })
  new ContextProvider(manager, { context: fileExplorerContext, initialValue: explorer })
  manager.append(card)
  document.body.append(manager)
  activeManagers.push(manager)
  return card
}

async function renderEditorCard () {
  const card = createEditorCard()
  await vi.waitFor(() => expect(initializeEditor).toHaveBeenCalledOnce())
  await vi.waitFor(() => expect(card._editorReady).toBe(true))
  await card.updateComplete
  return card
}

describe('Source-pane accessibility', () => {
  it('has no axe violations in the editable source state', async () => {
    const card = await renderEditorCard()
    card.beginEditing()
    await card.updateComplete

    expect(card.shadowRoot!.querySelector('.sourcePaneSaveButton')).not.toBeNull()
    expect(card.shadowRoot!.querySelector('.sourcePaneCancelButton')).not.toBeNull()
    expect((await axe(card)).violations).toEqual([])
  })

  it('keeps the rendered error status accessible', async () => {
    const card = await renderEditorCard()
    const status = getStatusSection(card.shadowRoot!)
    status.showError('Unable to save source', {
      title: 'Source could not be saved'
    })
    const error = card.shadowRoot!.querySelector<LitElement>('solid-ui-error-state')
    expect(error).not.toBeNull()
    await error!.updateComplete
    expect(error!.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull()
    expect((await axe(card)).violations).toEqual([])
  })
})
