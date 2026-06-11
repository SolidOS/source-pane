import { provide } from '@lit/context'
import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { renderHeader } from '../../Header'
import { getStatusSection } from '../../StatusSection'
import WebComponent from '../../primitives/WebComponent'
import { sourceContext, SourceContext } from '../../primitives/context'
import { SourcePaneState } from '../../types'

@customElement('solid-panes-source-provider')
export default class SourceProvider extends WebComponent {
  @property({ attribute: false })
  accessor context!: DataBrowserContext

  @property({ attribute: false })
  accessor subject!: NamedNode

  @property({ attribute: false })
  accessor sourcePaneState!: SourcePaneState

  @provide({ context: sourceContext })
  accessor sourceContextValue!: SourceContext

  // need this while we are using document.querySelector 
  // and rendering plain HTML children. Can remove later when all
  // code is refactored to use context and components.
  createRenderRoot () {
    return this
  }

  updateSourcePaneState = <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  protected willUpdate (changedProperties: Map<string, any>) {
    super.willUpdate(changedProperties)
    // will add in source pane updates later as I refactor the header code in
    // another ticket.
    this.sourceContextValue = {
      context: this.context,
      subject: this.subject?.uri ?? '',
      sourcePaneState: this.sourcePaneState,
      updateSourcePaneState: this.updateSourcePaneState,
    }
  }

  render() {
    const store = this.context.session.store
    const { renderStatusSection } = getStatusSection()

    return html`
      ${renderHeader(store, this.subject, this.sourcePaneState)}
      <solid-panes-source-editor-card></solid-panes-source-editor-card>
      ${renderStatusSection()}
    `
  }
}