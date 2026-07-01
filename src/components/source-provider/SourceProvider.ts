import { provide } from '@lit/context'
import { html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { renderHeader } from '../../Header'
import { getStatusSection } from '../../StatusSection'
import { WebComponent } from 'solid-ui'
import { sourceContext, SourceContext } from '../../primitives/context'
import { SourcePaneState } from '../../types'

const defaultSourcePaneState: SourcePaneState = {
  broken: false,
  dirty: false,
  editing: false,
  allowed: undefined,
  contentType: undefined,
  eTag: undefined
}

@customElement('solid-panes-source-provider')
export default class SourceProvider extends WebComponent {
  @property({ attribute: false })
  accessor context: DataBrowserContext | undefined = undefined

  @property({ attribute: false })
  accessor subject: NamedNode | undefined = undefined

  @property({ attribute: false })
  accessor sourcePaneState: SourcePaneState = defaultSourcePaneState

  @provide({ context: sourceContext })
  accessor sourceContextValue: SourceContext = {
    context: undefined as unknown as DataBrowserContext,
    subject: '',
    sourcePaneState: defaultSourcePaneState,
    updateSourcePaneState: () => {},
  }

  // need this while we are using document.querySelector 
  // and rendering plain HTML children. Can remove later when all
  // code is refactored to use context and components.
  createRenderRoot () {
    return this
  }

  private _requireContext () {
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    return this.context
  }

  private _requireSubject () {
    if (!this.subject) {
      throw new Error('The element is missing the required `subject` property.')
    }

    return this.subject
  }

  updateSourcePaneState = <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  protected willUpdate (changedProperties: Map<string, any>) {
    super.willUpdate(changedProperties)
    const context = this._requireContext()
    const subject = this._requireSubject()

    this.sourceContextValue = {
      context,
      subject: subject.uri,
      sourcePaneState: this.sourcePaneState,
      updateSourcePaneState: this.updateSourcePaneState,
    }
  }

  render() {
    const context = this._requireContext()
    const subject = this._requireSubject()
    const store = context.session.store
    const { renderStatusSection } = getStatusSection()

    return html`
      ${renderHeader(store, subject, this.sourcePaneState)}
      <solid-panes-source-editor-card></solid-panes-source-editor-card>
      ${renderStatusSection()}
    `
  }
}