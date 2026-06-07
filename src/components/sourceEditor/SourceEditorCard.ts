import { html } from 'lit'
import { createRef, ref } from 'lit/directives/ref.js'
import { customElement, property } from 'lit/decorators.js'
import { LiveStore, NamedNode } from 'rdflib'
import { fetchContentAndMetadata, setUnedited } from '../../helpers'
import styles from './SourceEditorCard.styles.css'
import WebComponent from '../../primitives/WebComponent'
import { SourcePaneState } from '../../types'
import { SourceEditor } from '../../SourceEditor'
import { getStatusSection } from '../../StatusSection'

@customElement('source-editor-card')
export default class SourceEditorCard extends WebComponent {
  static styles = styles
  private _editor!: SourceEditor
  private _editorMount = createRef<HTMLDivElement>()
  
  @property({ attribute: false })
  accessor store!: LiveStore

  @property({ attribute: false })
  accessor subject!: NamedNode

  @property({ attribute: false })
  accessor sourcePaneState!: SourcePaneState

  private _getFileName (uri: string) {
    const url = new URL(uri).pathname // remove #me and #this
    return url.substring(url.lastIndexOf('/') + 1)
  }

  getValue () {
    return this._editor.getValue()
  }

  focusEditor () {
    this._editor.focusEditor()
  }

  setReadOnly (readOnly: boolean) {
    this._editor.setReadOnly(readOnly)
  }

  setValue (text: string) {
    this._editor.replaceContent(text)
  }

  private async _initializeEditor () {
    const sourcePaneEditor = this._editorMount.value
    if (!sourcePaneEditor) return
    try {
      const { content, metadata } = await fetchContentAndMetadata(this.store, this.subject, this.sourcePaneState)
      this._editor = new SourceEditor()
      await this._editor.initialize(sourcePaneEditor, content, metadata.contentType)
      setUnedited(this.subject, this.sourcePaneState)
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
      // this._editor.destroy?.() need to write a destroy method.
      this._editor = undefined
    }
  }

  render() {
    return html`
      <section class="sourcePaneCard">
        <div class="sourcePaneEditor" ${ref(this._editorMount)}>
        </div>
        <p>${this._getFileName(this.subject.value)}</p>
      </section>
    `
  }
}
