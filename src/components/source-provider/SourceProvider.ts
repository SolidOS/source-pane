import { html, type PropertyValues } from 'lit'
import { provide } from '@lit/context'
import { customElement, property, query, state } from 'lit/decorators.js'
import { NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { getStatusSection } from '../../StatusSection'
import { WebComponent } from 'solid-ui'
import { sourceContext, SourceContext } from '../../primitives/context'
import { SourcePaneState, HeaderMetadata, EditorMetadata, ResourceMetadata } from '../../types'
import type SourceEditorCard from '../source-editor-card/SourceEditorCard'
import '../header/SourceHeader'
import { fetchContentAndMetadata } from '../../resourceLoader'
import styles from './SourceProvider.styles.css'
void import('../source-editor-card/SourceEditorCard').then(() => undefined)

function createDefaultSourcePaneState(): SourcePaneState {
  return { 
    broken: false,
    dirty: false,
    editing: false
  }
}

function createDefaultHeaderMetadata(): HeaderMetadata {
  return { 
    canEdit: false,
    isPublic: false,
    modified: undefined
  }
}

function createDefaultEditorMetadata(): EditorMetadata {
  return {
    contentType: undefined,
    eTag: undefined
  }
}

function createSourceContextValue(input: {
  context: DataBrowserContext | undefined
  subject: NamedNode | undefined
  originalContent: string | undefined
  sourcePaneState: SourcePaneState
  headerMetadata: HeaderMetadata
  editorMetadata: EditorMetadata
  updateSourcePaneState: SourceProvider['updateSourcePaneState']
  updateMetadata: SourceProvider['updateEditorMetadata']
  setEditing: SourceProvider['setEditing']
}): SourceContext {
  return {
    context: input.context as DataBrowserContext,
    subject: input.subject?.uri ?? '',
    originalContent: input.originalContent,
    sourcePaneState: input.sourcePaneState,
    headerMetadata: input.headerMetadata,
    editorMetadata: input.editorMetadata,
    updateSourcePaneState: input.updateSourcePaneState,
    updateMetadata: input.updateMetadata,
    setEditing: input.setEditing,
  }
}
@customElement('source-pane-source-provider')
export default class SourceProvider extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor context: DataBrowserContext | undefined = undefined

  @property({ attribute: false })
  accessor subject: NamedNode | undefined = undefined

  @state()
  accessor originalContent: string | undefined = undefined

  @state()
  accessor dataLoaded = false

  @state()
  accessor sourcePaneState: SourcePaneState = createDefaultSourcePaneState()

  @state()
  accessor headerMetadata: HeaderMetadata = createDefaultHeaderMetadata()

  @state()
  accessor editorMetadata: EditorMetadata = createDefaultEditorMetadata()


  @provide({ context: sourceContext })
  accessor sourceContextValue: SourceContext = createSourceContextValue({
    context: undefined,
    subject: undefined,
    originalContent: undefined,
    sourcePaneState: createDefaultSourcePaneState(),
    headerMetadata: createDefaultHeaderMetadata(),
    editorMetadata: createDefaultEditorMetadata(),
    updateSourcePaneState: () => {},
    updateMetadata: () => {},
    setEditing: () => {},
  })

  @query('source-pane-source-editor-card')
  private accessor editorCard: SourceEditorCard | null = null

  private loadContentAndMetadata = async () => {
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }
    if (!this.subject) {
      throw new Error('The element is missing the required `subject` property.')
    }
    try {
      const { content, metadata } = await fetchContentAndMetadata(this.context.session.store as any, this.subject)
      this.originalContent = content
      this.updateEditorMetadata(metadata)
      this.dataLoaded = true
    } catch (error: any) {
      const { showError } = getStatusSection()
      showError(error.message)
    }
  }

  private refreshSourceContextValue() {
    this.sourceContextValue = createSourceContextValue({
      context: this.context,
      subject: this.subject,
      originalContent: this.originalContent,
      sourcePaneState: this.sourcePaneState,
      headerMetadata: this.headerMetadata,
      editorMetadata: this.editorMetadata,
      updateSourcePaneState: this.updateSourcePaneState,
      updateMetadata: this.updateEditorMetadata,
      setEditing: this.setEditing,
    })
  }

  updateSourcePaneState = <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  updateEditorMetadata = (metadata: ResourceMetadata) => {
    this.editorMetadata = {
      contentType: metadata.contentType,
      eTag: metadata.eTag
    }
    this.headerMetadata = {
      canEdit: metadata.canEdit,
      isPublic: metadata.isPublic,
      modified: metadata.modified
    }
  }

  setEditing = () => {
    this.updateSourcePaneState('editing', true)
    this.editorCard?.updateEditingState(true)
    this.editorCard?.setReadOnly(false)
    this.editorCard?.focusEditor()
  }

  protected async firstUpdated() {
    await this.loadContentAndMetadata()
  }

  protected willUpdate (changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties)
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    this.refreshSourceContextValue()
  }

  render() {
    return html`
      ${this.dataLoaded
        ? html`
            <source-pane-source-header></source-pane-source-header>
            <source-pane-source-editor-card></source-pane-source-editor-card>
          `
        : html``}
    `
  }
}
