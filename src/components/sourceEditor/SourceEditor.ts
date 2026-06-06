import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { LiveStore, NamedNode } from 'rdflib'
import { refresh, setEdited } from '../../helpers'
import styles from './SourceEditor.styles.css'
import WebComponent from '../../primitives/WebComponent'
import { SourcePaneState } from '../../types'

@customElement('source-editor')
export default class SourceEditor extends WebComponent {
  static styles = styles
  @property({ attribute: false })
  accessor store!: LiveStore

  @property({ attribute: false })
  accessor subject!: NamedNode

  @property({ attribute: false })
  accessor sourcePaneState!: SourcePaneState

  getTextArea () {
    return this.renderRoot.querySelector('.sourcePaneTextArea') as HTMLTextAreaElement | null
  }

  focusEditor () {
    this.getTextArea()?.focus({ preventScroll: true })
    this.getTextArea()?.setSelectionRange(0, 0)
  }

  connectedCallback () {
    super.connectedCallback()
  }

  firstUpdated () {
    refresh(this.store, this.subject, this.sourcePaneState)
  }

  render() {
    return html`
      <section class="sourcePaneMain">
        <textarea class="sourcePaneTextArea" 
          @input=${(event: Event) =>
            setEdited(
              this.sourcePaneState,
              event.currentTarget as HTMLTextAreaElement
    )}></textarea>
      </section>
    `
  }
}
