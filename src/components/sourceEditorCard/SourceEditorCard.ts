import { html } from 'lit'
import { consume } from '@lit/context'
import { createRef, ref } from 'lit/directives/ref.js'
import { customElement, state } from 'lit/decorators.js'
import { NamedNode, parse, serialize } from 'rdflib'
import type { SourceEditor } from './SourceEditor'
import { applyResponseHeaders, checkSyntax, fetchContentAndMetadata, getResponseHeaders, happy } from '../../helpers'
import styles from './SourceEditorCard.styles.css'
import { WebComponent } from 'solid-ui'
import { getStatusSection } from '../../StatusSection'
import { SourceContext } from '../../primitives/context'
import { sourceContext } from '../../primitives/context'
import 'solid-ui/components/button'
import { compactable } from '../../compactableFormats'

@customElement('solid-panes-source-editor-card')
export default class SourceEditorCard extends WebComponent {
  static styles = styles
  private _editor?: SourceEditor
  private _originalContent?: string
  private _dirtyState = false
  private _editingState = false

  @state()
  accessor _editorReady = false
  private _editorMount = createRef<HTMLDivElement>()

  @consume({ context: sourceContext, subscribe: true })
  accessor sourceContext: SourceContext = undefined as unknown as SourceContext

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
  }

  setValue (text: string) {
    this._editor?.replaceContent(text)
  }

  updateDirtyState(dirty: boolean) {
    if (this._dirtyState === dirty) return
    this._dirtyState = dirty
    this.sourceContext?.updateSourcePaneState('dirty', dirty)
  }

  updateEditingState(editing: boolean) {
    if (this._editingState === editing) return
    this._editingState = editing
    this.sourceContext?.updateSourcePaneState('editing', editing)
  }

  private _resetEditorState() {
    this._editor?.resetDirtyState()
    this.updateDirtyState(false)
    this.updateEditingState(false)
    this._editor?.setReadOnly(true)
  }

  private async _initializeEditor () {
    if (this._editor) return
    const sourcePaneEditor = this._editorMount.value
    const sourceContext = this.sourceContext
    if (!sourcePaneEditor || !sourceContext) {
      return
    }
    try {
      const { SourceEditor } = await import('./SourceEditor')
      const { content, metadata } = await fetchContentAndMetadata(sourceContext.context.session.store, new NamedNode(sourceContext.subject), sourceContext.sourcePaneState)
      this._originalContent = content
      this._editor = new SourceEditor()
      await this._editor.initialize(sourcePaneEditor, content, metadata.contentType, 'dark', dirty => {
        this.updateDirtyState(dirty)
      })
      this._editorReady = true
      this._editor?.setReadOnly(true)
    } catch (err) {
      const { showError } = getStatusSection()
      showError('Error fetching content: ' + err)
    }
  }

  async firstUpdated () {
    await this._initializeEditor()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this._editor) {
      this._editor.destroy()
      this._editor = undefined
    }
    this._editorReady = false
    this._dirtyState = false
    this._editingState = false
  }

  private cancelHandler = () => {
    const sourceContext = this.sourceContext
    if (!sourceContext) return
    const currentContent = this.getEditor()?.getValue()
    if (this._originalContent !== undefined && currentContent !== this._originalContent) {
      this.setValue(this._originalContent)
    }
    this._resetEditorState()
  }

  private saveBack = async () => {
    const sourceContext = this._requireSourceContext()

    const store = sourceContext.context.session.store
    const subject = new NamedNode(sourceContext.subject)
    const sourcePaneState = sourceContext.sourcePaneState
    const fetcher = store.fetcher
    const data = this.getEditor()?.getValue() ?? ''
    const { contentType, eTag } = sourceContext.sourcePaneState
    if (!checkSyntax(store, subject, data, contentType, subject)) {
      const { showError } = getStatusSection()
      showError('Syntax error: fix the document before saving.')
      return
    }
    const options: { data: string; contentType: string | undefined; headers?: { 'if-match': string } } = { data, contentType }
    if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412
    try {
      const response = await fetcher.webOperation('PUT', subject.uri, options)
      if (!happy(response, 'PUT')) return
      this._originalContent = data
      /// @@ show edited: make save button disabled until edited again.
      try {
        const response = await fetcher.webOperation('HEAD', subject.uri) // , defaultFetchHeaders())
        if (!happy(response, 'HEAD')) return
        applyResponseHeaders(sourcePaneState, getResponseHeaders(store, subject, response))
        this._resetEditorState()
      } catch (err) {
        throw err
      }
    } catch (err: any) {
      const { showError } = getStatusSection()
      showError('Error saving back: ' + err)
    }
  }

  private prettyHandler = () => {
    const sourceContext = this._requireSourceContext()

    const { contentType } = sourceContext.sourcePaneState
    const compactContentType = contentType?.split(';')[0]
    const { showError } = getStatusSection()
    const store = sourceContext.context.session.store
    const subjectNode = new NamedNode(sourceContext.subject)

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
  
  render() {
    const sourceContext = this._requireSourceContext()
    const sectionClass = this._editorReady ? 'sourcePaneCard' : 'sourcePaneCard sourcePaneCardLoading'
    const compactContentType = sourceContext.sourcePaneState.contentType?.split(';')[0]
    const showPrettyButton = !this._editingState && !!compactContentType && compactable[compactContentType]
    const prettyButton = showPrettyButton
      ? html`
          <solid-ui-button class="sourcePanePrettyButton" variant="secondary" @click=${this.prettyHandler}>Prettify</solid-ui-button>
        `
      : html``

    return html`
      <section class=${sectionClass}>
        <div class="sourcePaneEditor" ${ref(this._editorMount)}></div>
        <div class="sourcePaneEditorFooter">
          ${this._editingState
            ? html`
                <solid-ui-button class="sourcePaneCancelButton" variant="secondary" @click=${this.cancelHandler}>Cancel</solid-ui-button>
                <solid-ui-button class="sourcePaneSaveButton" variant="primary" @click=${this.saveBack}>Save Changes</solid-ui-button>
              `
            : prettyButton}
        </div>
      </section>
    `
  }
}
