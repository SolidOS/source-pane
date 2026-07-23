import { html, type PropertyValues } from 'lit'
import { provide } from '@lit/context'
import { customElement, property, query } from 'lit/decorators.js'
import { NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { getStatusSection } from '../../StatusSection'
import { WebComponent, AccessControlService } from 'solid-ui'
import { sourceContext, SourceContext } from '../../primitives/context'
import { SourcePaneState } from '../../types'
import type SourceEditorCard from '../source-editor-card/SourceEditorCard'
import '../header/SourceHeader'

void import('../source-editor-card/SourceEditorCard').then(() => undefined)

const defaultSourcePaneState: SourcePaneState = {
  broken: false,
  dirty: false,
  editing: false,
  allowed: undefined,
  contentType: undefined,
  eTag: undefined,
  modified: undefined
}

@customElement('source-pane-source-provider')
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
    accessControlService: undefined as unknown as AccessControlService,
    sourcePaneState: defaultSourcePaneState,
    updateSourcePaneState: () => {},
    setEditing: () => {}
  }

  @query('source-pane-source-editor-card')
  private accessor editorCard: SourceEditorCard | null = null
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

  setEditing = () => {
    this.updateSourcePaneState('editing', true)
    this.editorCard?.updateEditingState(true)
    this.editorCard?.setReadOnly(false)
    this.editorCard?.focusEditor()
  }

  protected willUpdate (changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties)

    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    this.sourceContextValue = {
      context: this.context,
      subject: this.subject?.uri ?? '',
      accessControlService: new AccessControlService(this.context.session.store, this.context.session.store.fetcher, this.context.session.store.updater),
      sourcePaneState: this.sourcePaneState,
      updateSourcePaneState: this.updateSourcePaneState,
      setEditing: this.setEditing
    }
  }

  render() {
    const { renderStatusSection } = getStatusSection()

    return html`
      <source-pane-source-header></source-pane-source-header>
      <source-pane-source-editor-card></source-pane-source-editor-card>
      ${renderStatusSection()}
    `
  }
}
