import { html, type PropertyValues } from 'lit'
import { consume, provide } from '@lit/context'
import { customElement, property, state } from 'lit/decorators.js'
import { NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { getStatusSection } from '../../StatusSection'
import { warn } from '../../debug'
import { WebComponent } from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'
import { sourceContext, SourceContext } from '../../primitives/context'
import { SourcePaneState, EditorMetadata } from '../../types'
import type SourceEditorCard from '../source-editor-card/SourceEditorCard'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext, type FileExplorerContext } from 'solid-ui'

function createDefaultSourcePaneState(): SourcePaneState {
  return { 
    broken: false
  }
}

function createDefaultEditorMetadata(): EditorMetadata {
  return {
    contentType: undefined,
    eTag: undefined
  }
}

function createSourceContextValue(input: {
  dataLoaded: boolean
  resourceUri: string | undefined
  originalContent: string | undefined
  sourcePaneState: SourcePaneState
  editorMetadata: EditorMetadata
  updateSourcePaneState: SourceProvider['updateSourcePaneState']
  updateContent: SourceProvider['updateOriginalContent']
  updateMetadata: SourceProvider['updateEditorMetadata']
}): SourceContext {
  return {
    dataLoaded: input.dataLoaded,
    resourceUri: input.resourceUri,
    originalContent: input.originalContent,
    sourcePaneState: input.sourcePaneState,
    editorMetadata: input.editorMetadata,
    updateSourcePaneState: input.updateSourcePaneState,
    updateContent: input.updateContent,
    updateMetadata: input.updateMetadata,
  }
}

@customElement('source-pane-source-provider')
export default class SourceProvider extends WebComponent {
  @property({ attribute: false })
  accessor context: DataBrowserContext | undefined = undefined

  @property({ attribute: false })
  accessor subject: NamedNode | undefined = undefined

  @consume({ context: fileExplorerContext, subscribe: true })
  accessor fileExplorerContext: FileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT

  @state()
  accessor originalContent: string | undefined = undefined

  @state()
  accessor dataLoaded = false

  @state()
  accessor sourcePaneState: SourcePaneState = createDefaultSourcePaneState()

  @state()
  accessor editorMetadata: EditorMetadata = createDefaultEditorMetadata()

  @provide({ context: sourceContext })
  accessor sourceContextValue: SourceContext = createSourceContextValue({
    dataLoaded: false,
    resourceUri: undefined,
    originalContent: undefined,
    sourcePaneState: createDefaultSourcePaneState(),
    editorMetadata: createDefaultEditorMetadata(),
    updateSourcePaneState: () => {},
    updateContent: () => {},
    updateMetadata: () => {},
  })

  private loadGeneration = 0

  private loadContentAndMetadata = async () => {
    if (!this.context || !this.subject) return

    const subjectUri = this.subject.uri
    const loadGeneration = ++this.loadGeneration

    try {
      const { content, metadata } = await solidLogicSingleton.resource.fetchContentAndMetadata(this.subject)
      if (this.subject?.uri !== subjectUri || loadGeneration !== this.loadGeneration) return

      this.originalContent = content
      this.updateEditorMetadata(metadata)
      this.dataLoaded = true
    } catch (error: any) {
      warn('Failed to load source content', error)
      const { showError } = getStatusSection()
      showError(error.message)
    }
  }

  private refreshSourceContextValue() {
    const resourceUri = this.subject?.uri
    const updateContent = (content: string) => {
      if (this.subject?.uri !== resourceUri) return
      this.updateOriginalContent(content)
    }

    this.sourceContextValue = createSourceContextValue({
      dataLoaded: this.dataLoaded,
      resourceUri,
      originalContent: this.originalContent,
      sourcePaneState: this.sourcePaneState,
      editorMetadata: this.editorMetadata,
      updateSourcePaneState: this.updateSourcePaneState,
      updateContent,
      updateMetadata: this.updateEditorMetadata,
    })
  }

  private unregisterEditor?: () => void
  private registeredWith?: FileExplorerContext['registerEditor']
  private _editingRequested = false
  private _childObserver?: MutationObserver

  updateSourcePaneState = <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  updateOriginalContent = (content: string) => {
    this.originalContent = content
  }

  updateEditorMetadata = (metadata: EditorMetadata) => {
    this.editorMetadata = {
      contentType: metadata.contentType,
      eTag: metadata.eTag
    }
  }

  beginEditing = () => {
    const editorCard = this.querySelector<SourceEditorCard>('source-pane-source-editor-card')
    if (editorCard) {
      editorCard.beginEditing()
    } else {
      this._editingRequested = true
    }
  }

  private applyPendingEditing () {
    if (!this._editingRequested) return
    const editorCard = this.querySelector<SourceEditorCard>('source-pane-source-editor-card')
    if (!editorCard) return
    this._editingRequested = false
    editorCard.beginEditing()
  }

  private refreshEditorRegistration () {
    if (!this.isConnected) return

    const context = this.fileExplorerContext
    const registerEditor = !context || context === DEFAULT_FILE_EXPLORER_CONTEXT ? undefined : context.registerEditor
    // Context values change with dirty/editing state; the provider's registrar is stable.
    if (this.registeredWith === registerEditor) return

    this.unregisterEditor?.()
    this.unregisterEditor = undefined
    this.registeredWith = undefined

    if (registerEditor) {
      this.unregisterEditor = context.registerEditor(this)
      this.registeredWith = registerEditor
    }
  }

  connectedCallback () {
    super.connectedCallback()
    this._childObserver = new MutationObserver(() => this.applyPendingEditing())
    this._childObserver.observe(this, { childList: true })
    this.requestUpdate()
  }

  disconnectedCallback () {
    this._childObserver?.disconnect()
    this._childObserver = undefined
    this.unregisterEditor?.()
    this.unregisterEditor = undefined
    this.registeredWith = undefined
    super.disconnectedCallback()
  }

  protected willUpdate (changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties)
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    if (changedProperties.has('context') || changedProperties.has('subject')) {
      this.loadGeneration++
      this.dataLoaded = false
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subject') ||
      changedProperties.has('dataLoaded') ||
      changedProperties.has('originalContent') ||
      changedProperties.has('sourcePaneState') ||
      changedProperties.has('editorMetadata')
    ) {
      this.refreshSourceContextValue()
    }
  }

  protected updated (changedProperties: PropertyValues<this>) {
    super.updated(changedProperties)
    this.refreshEditorRegistration()

    if (changedProperties.has('context') || changedProperties.has('subject')) {
      void this.loadContentAndMetadata()
    }
  }

  render () {
    return html`<slot></slot>`
  }
}
