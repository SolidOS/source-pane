import { html } from 'lit'
import { consume } from '@lit/context'
import { createRef, ref } from 'lit/directives/ref.js'
import { customElement, state } from 'lit/decorators.js'
import { NamedNode } from 'rdflib'
import type { SourceEditor } from './SourceEditor'
import { fetchContentAndMetadata, setUnedited } from '../../helpers'
import styles from './SourceEditorCard.styles.css'
import WebComponent from '../../primitives/WebComponent'
import { getStatusSection } from '../../StatusSection'
import { SourceContext } from '../../primitives/context'
import { sourceContext } from '../../primitives/context'

@customElement('solid-panes-source-editor-card')
export default class SourceEditorCard extends WebComponent {
  static styles = styles
  private _editor?: SourceEditor
  @state()
  accessor _editorReady = false
  private _editorMount = createRef<HTMLDivElement>()

  @consume({ context: sourceContext, subscribe: true })
  accessor sourceContext: SourceContext | undefined

  private _getSourceContext () {
    return this.sourceContext
  }

  private _getFileName (uri?: string) {
    if (!uri) return ''
    const url = new URL(uri).pathname // remove #me and #this
    return url.substring(url.lastIndexOf('/') + 1)
  }

  getValue () {
    return this._editor?.getValue()
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

  private async _initializeEditor () {
    if (this._editor) return
    const sourcePaneEditor = this._editorMount.value
    const sourceContext = this._getSourceContext()
    if (!sourcePaneEditor || !sourceContext) {
      return
    }
    try {
      const { SourceEditor } = await import(/* webpackChunkName: "source-editor" */ './SourceEditor')
      const subjectNode = new NamedNode(sourceContext.subject)
      const { content, metadata } = await fetchContentAndMetadata(sourceContext.context.session.store, subjectNode, sourceContext.sourcePaneState)
      this._editor = new SourceEditor()
      await this._editor.initialize(sourcePaneEditor, content, metadata.contentType)
      this._editorReady = true
      setUnedited(subjectNode, sourceContext.sourcePaneState)
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
  }

  render() {
    const sectionClass = this._editorReady ? 'sourcePaneCard' : 'sourcePaneCard sourcePaneCardLoading'

    return this._getSourceContext() ? html`
      <section class=${sectionClass}>
        <div class="sourcePaneEditor" ${ref(this._editorMount)}></div>
        <p>${this._getFileName(this._getSourceContext()?.subject)}</p>
      </section>
    ` : html``
  }
}
