import { html, nothing } from 'lit'
import { consume } from '@lit/context'
import { customElement, property, query, state } from 'lit/decorators.js'
import { NamedNode, parse, serialize } from 'rdflib'
import { WebComponent, type CodeEditor } from 'solid-ui'
import { DEFAULT_FILE_EXPLORER_CONTEXT, fileExplorerContext } from 'solid-ui'
import { solidLogicSingleton } from 'solid-logic'
import 'solid-ui/components/button'
import { checkSyntax, happy } from '../../helpers'
import styles from './SourceEditorCard.styles.css'
import { getStatusSection } from '../../StatusSection'
import { compactable } from '../../compactableFormats'
import { sourceContext, SourceContext } from '../../primitives/context'

@customElement('source-pane-source-editor-card')
export default class SourceEditorCard extends WebComponent {
  static styles = styles

  private _editor?: CodeEditor
  private _originalContent?: string
  private _originalContentType?: string
  private _loadedResourceUri?: string
  private _dirtyState = false
  private _initializing = false
  private _syncGeneration = 0
  private _syncQueue: Promise<void> = Promise.resolve()
  private _editingRequested = false

  @state()
  accessor _editorReady = false

  @state()
  accessor _editorError = false

  private _isEditing = false
  
  @query('.sourcePaneEditor')
  accessor _editorMount: HTMLDivElement | null = null

  @consume({ context: sourceContext, subscribe: true })
  @property({ attribute: false })
  accessor sourceContext: SourceContext = undefined as unknown as SourceContext

  @consume({ context: fileExplorerContext, subscribe: true })
  @property({ attribute: false })
  accessor fileExplorerContext = DEFAULT_FILE_EXPLORER_CONTEXT

  private _requireSourceContext () {
    if (!this.sourceContext) {
      throw new Error('The element is missing the required `sourceContext` property.')
    }

    return this.sourceContext
  }

  getOriginalContent () {
    return this._originalContent
  }

  getEditor () {
    return this._editor
  }

  focusEditor () {
    this._editor?.focusEditor()
  }

  setReadOnly (readOnly: boolean) {
    this._editor?.setReadOnly(readOnly)
    this._editor?.setAccessibility?.({
      label: this._editorLabel(),
      description: readOnly
        ? 'Source content. This content is read-only until Edit is selected.'
        : 'Source editor. You can edit this content and use Save or Cancel when finished.'
    })
  }

  private _editorLabel () {
    return `Source editor for ${this.sourceContext?.resourceUri ?? 'the selected resource'}`
  }

  private _statusRoot (): ParentNode {
    return this.shadowRoot ?? this.closest('.sourcePane') ?? document
  }

  private _preservePaneDuringResize (preserve: boolean) {
    const sourcePane = this.closest('.sourcePane')
    if (!sourcePane) return
    if (preserve) {
      sourcePane.setAttribute('data-preserve-pane-on-resize', 'true')
    } else {
      sourcePane.removeAttribute('data-preserve-pane-on-resize')
    }
  }

  private _focusEditorAfterUpdate () {
    void this.updateComplete.then(() => this.focusEditor())
  }

  setValue (text: string) {
    this._editor?.replaceContent(text)
  }

  beginEditing() {
    if (!this._editorReady) {
      this._editingRequested = true
      return
    }

    this._editingRequested = false
    this.updateEditingState(true)
    this.setReadOnly(false)
    this.focusEditor()
    this.requestUpdate()
  }

  private async _getViewContent() {
    const sourceContext = this._requireSourceContext()
    return {
      content: sourceContext.originalContent ?? '',
      contentType: this._originalContentType ?? sourceContext.editorMetadata.contentType ?? 'text/turtle'
    }
  }

  private async _syncEditorToCurrentView (syncGeneration?: number) {
    if (!this._editor) return

    this.updateEditingState(false)
    const sourceContext = this._requireSourceContext()
    this._originalContent = sourceContext.originalContent
    this._originalContentType = sourceContext.editorMetadata.contentType
    const content = sourceContext.originalContent ?? ''
    const contentType = this._originalContentType ?? 'text/turtle'
    await this._editor.setLanguage(contentType)
    if (syncGeneration !== undefined && syncGeneration !== this._syncGeneration) return
    this.setReadOnly(true)
    this._editor.replaceContent(content)
    this._editor.resetDirtyState()
    this.updateDirtyState(false)
  }

  private queueEditorSynchronization () {
    const syncGeneration = ++this._syncGeneration
    this._syncQueue = this._syncQueue.then(() => this._syncEditorToCurrentView(syncGeneration))
    return this._syncQueue
  }

  updateDirtyState(dirty: boolean) {
    if (this._dirtyState === dirty) return
    this._dirtyState = dirty
    this.fileExplorerContext.setDirty(dirty)
  }

  updateEditingState(editing: boolean) {
    this._preservePaneDuringResize(editing)
    if (this._isEditing === editing) return
    this._isEditing = editing
    this.requestUpdate()
  }

  private _resetEditorState() {
    this._editor?.resetDirtyState()
    this.updateDirtyState(false)
    this.updateEditingState(false)
    this.setReadOnly(true)
  }

  private async _initializeEditor () {
    if (this._editor || this._initializing) return
    const sourcePaneEditor = this._editorMount
    const sourceContext = this.sourceContext
    const explorerContext = this.fileExplorerContext
    if (!sourcePaneEditor || !sourceContext?.dataLoaded ||
      !explorerContext || explorerContext === DEFAULT_FILE_EXPLORER_CONTEXT ||
      !explorerContext.store || !explorerContext.subjectUri) return

    this._initializing = true
    this._editorError = false
    try {
      const { CodeEditor } = await import('solid-ui')
      this._originalContent = sourceContext.originalContent
      this._originalContentType = sourceContext.editorMetadata.contentType
      this._editor = new CodeEditor()
      const { content, contentType } = await this._getViewContent()
      try {
        await this._editor.initialize(
          sourcePaneEditor,
          content,
          contentType,
          'dark',
          dirty => { this.updateDirtyState(dirty) },
          {
            label: this._editorLabel(),
            description: 'Source content. This content is read-only until Edit is selected.'
          }
        )
      } catch (err) {
        throw new Error(`Error initializing code editor: ${err instanceof Error ? err.message : String(err)}`)
      }
      this._editorReady = true
      this._loadedResourceUri = sourceContext.resourceUri
      this.setReadOnly(true)
      if (this._editingRequested) this.beginEditing()
    } catch (err) {
      this._editorReady = false
      this._editorError = true
      this._editor?.destroy()
      this._editor = undefined
      const { showError } = getStatusSection(this._statusRoot())
      showError(`Error loading code editor: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      this._initializing = false
    }
  }

  async firstUpdated () {
    await this._initializeEditor()
  }

  protected async updated (changedProperties: Map<string, unknown>) {
    if (changedProperties.has('sourceContext') && !this.sourceContext?.dataLoaded) {
      this._loadedResourceUri = undefined
      return
    }

    if ((!changedProperties.has('sourceContext') && !changedProperties.has('fileExplorerContext')) ||
      !this.sourceContext?.dataLoaded) return

    if (!this._editor) {
      this._editorError = false
      await this._initializeEditor()
    } else if (this._loadedResourceUri !== this.sourceContext.resourceUri) {
      this._loadedResourceUri = this.sourceContext.resourceUri
      await this.queueEditorSynchronization()
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._editor) {
      this._editor.destroy()
      this._editor = undefined
    }
    this._editorReady = false
    this._dirtyState = false
    this._initializing = false
    this._loadedResourceUri = undefined
  }

  private async cancelHandler () {
    const sourceContext = this.sourceContext
    if (!sourceContext) return
    await this.queueEditorSynchronization()
    this._resetEditorState()
    getStatusSection(this._statusRoot()).showStatus('Source changes canceled.')
    this._focusEditorAfterUpdate()
  }

  private async saveBack () {
    const sourceContext = this._requireSourceContext()

    const store = this.fileExplorerContext?.store as any
    const subjectUri = this.fileExplorerContext?.subjectUri
    if (!store || !subjectUri) {
      throw new Error('The element is missing the required `fileExplorerContext.store` or `fileExplorerContext.subjectUri` property.')
    }
    const subject = new NamedNode(subjectUri)
    const fetcher = store.fetcher
    const data = this.getEditor()?.getValue() ?? ''
    const contentType = this._originalContentType ?? sourceContext.editorMetadata.contentType ?? 'text/turtle'
    const eTag = sourceContext.editorMetadata.eTag
    const saveSubject = subject
    if (!checkSyntax(store, saveSubject as any, data, contentType, saveSubject as any, this._statusRoot())) {
      return
    }
    const options: { data: string; contentType: string | undefined; headers?: { 'if-match': string } } = { data, contentType }
    if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412

    let response: Response
    try {
      response = await fetcher.webOperation('PUT', saveSubject.uri, options)
      if (!happy(response, 'PUT', this._statusRoot())) return
    } catch (err: any) {
      const { showError } = getStatusSection(this._statusRoot())
      showError('Error saving back: ' + err)
      return
    }

    if (sourceContext.resourceUri === saveSubject.uri) {
      this._originalContent = data
      sourceContext.updateContent(data)
    }

    let refreshError: unknown
    try {
      if (typeof fetcher.load === 'function') {
        await fetcher.load(saveSubject, { force: true, clearPreviousData: true })
      }
      const metadataResponse = await fetcher.webOperation('HEAD', saveSubject.uri) // , defaultFetchHeaders())
      if (!metadataResponse.ok) {
        throw new Error(`HTTP error on HEAD! Status: ${metadataResponse.status}`)
      }
      const metadata = await solidLogicSingleton.resource.fetchMetadata(saveSubject)
      if (sourceContext.resourceUri === saveSubject.uri) {
        sourceContext.updateMetadata({
          contentType: metadata.contentType,
          eTag: metadata.eTag
        })
      }
    } catch (err) {
      refreshError = err
    }

    if (refreshError) {
      const { showError } = getStatusSection(this._statusRoot())
      showError('Saved, but failed to refresh metadata: ' + refreshError)
    }

    if (sourceContext.resourceUri === saveSubject.uri) {
      this._resetEditorState()
      this._focusEditorAfterUpdate()
    }
  }

  private prettyHandler () {
    const sourceContext = this._requireSourceContext()

    const { contentType } = sourceContext.editorMetadata
    const compactContentType = contentType?.split(';')[0]
    const { showError } = getStatusSection(this._statusRoot())
    const store = this.fileExplorerContext?.store as any
    const subjectUri = this.fileExplorerContext?.subjectUri
    if (!store || !subjectUri) {
      throw new Error('The element is missing the required `fileExplorerContext.store` or `fileExplorerContext.subjectUri` property.')
    }
    const subjectNode = new NamedNode(subjectUri)

    if (compactContentType && compactable[compactContentType]) {
      try {
        const text = this.getEditor()?.getValue() ?? ''
        parse(text, store, subjectNode.uri, compactContentType)
        // for jsonld serialize which is a Promise. New rdflib
        const serialized = Promise.resolve(serialize(store.sym(subjectNode.uri), store, subjectNode.uri, compactContentType))
        serialized.then(result => {
          if (typeof result === 'string') this.setValue(result)
        })
      } catch (e: any) {  
        showError(String(e))
      }
    }
  }

  private renderFooter() {
    const sourceContext = this._requireSourceContext()
    const compactContentType = sourceContext.editorMetadata.contentType?.split(';')[0]
    const showPrettyButton = !this._isEditing && !!compactContentType && compactable[compactContentType]

    if (this._isEditing) {
      return html`
        <div class="sourcePaneEditorFooter">
          <solid-ui-button class="sourcePaneCancelButton" variant="secondary" @click=${this.cancelHandler}>Cancel</solid-ui-button>
          <solid-ui-button class="sourcePaneSaveButton" variant="primary" @click=${this.saveBack}>Save Changes</solid-ui-button>
        </div>
      `
    }

    if (showPrettyButton) {
      return html`
        <div class="sourcePaneEditorFooter">
          <solid-ui-button class="sourcePanePrettyButton" variant="secondary" @click=${this.prettyHandler}>Prettify</solid-ui-button>
        </div>
      `
    }

    return nothing
  }
  
  render() {
    const ready = this._editorReady && this.sourceContext?.dataLoaded && !this._editorError
    const sectionClass = ready
      ? 'sourcePaneCard'
      : 'sourcePaneCard sourcePaneCardLoading'

    return html`
      <section
        class=${sectionClass}
        role="region"
        aria-busy=${ready || this._editorError ? 'false' : 'true'}
        aria-label=${this._editorLabel()}
      >
        ${ready || this._editorError ? nothing : html`
          <div class="sourcePaneCardLoadingMessage" role="status">
            Loading source editor
          </div>
        `}
        <div class="sourcePaneEditor"></div>
        ${getStatusSection().renderStatusSection()}
        ${this.renderFooter()}
      </section>
    `
  }
}
