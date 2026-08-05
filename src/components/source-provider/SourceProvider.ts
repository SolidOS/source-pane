import { html, nothing, type PropertyValues } from 'lit'
import { provide } from '@lit/context'
import { customElement, property, query, state } from 'lit/decorators.js'
import { consume } from '@lit/context'
import { NamedNode } from 'rdflib'
import { DataBrowserContext } from 'pane-registry'
import { getStatusSection } from '../../StatusSection'
import { WebComponent } from 'solid-ui'
import { sourceContext, SourceContext } from '../../primitives/context'
import { SourcePaneState, EditorMetadata } from '../../types'
import type SourceEditorCard from '../source-editor-card/SourceEditorCard'
import { fetchContentAndMetadata } from '../../resourceLoader'
import { fileExplorerContext, type FileExplorerContext } from 'solid-ui'
import styles from './SourceProvider.styles.css'
void import('../source-editor-card/SourceEditorCard').then(() => undefined)

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
  originalContent: string | undefined
  sourcePaneState: SourcePaneState
  editorMetadata: EditorMetadata
  updateSourcePaneState: SourceProvider['updateSourcePaneState']
  updateMetadata: SourceProvider['updateEditorMetadata']
}): SourceContext {
  return {
    originalContent: input.originalContent,
    sourcePaneState: input.sourcePaneState,
    editorMetadata: input.editorMetadata,
    updateSourcePaneState: input.updateSourcePaneState,
    updateMetadata: input.updateMetadata,
  }
}

function createFileExplorerContextValue(input: {
  parentContext?: FileExplorerContext
  context: DataBrowserContext | undefined
  subject: NamedNode | undefined
}): FileExplorerContext {
  const inherited: Partial<FileExplorerContext> = input.parentContext ?? {}

  return {
    ...inherited,
    store: inherited.store ?? (input.context?.session.store as FileExplorerContext['store']),
    subjectUri: input.subject?.uri ?? inherited.subjectUri,
    paneSupportsEditing: inherited.paneSupportsEditing ?? true,
    edit: inherited.edit
  }
}
@customElement('source-pane-source-provider')
export default class SourceProvider extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor context: DataBrowserContext | undefined = undefined

  @property({ attribute: false })
  accessor subject: NamedNode | undefined = undefined

  @consume({ context: fileExplorerContext, subscribe: true })
  accessor parentFileExplorerContext: FileExplorerContext = undefined as unknown as FileExplorerContext

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
    originalContent: undefined,
    sourcePaneState: createDefaultSourcePaneState(),
    editorMetadata: createDefaultEditorMetadata(),
    updateSourcePaneState: () => {},
    updateMetadata: () => {},
  })

  @provide({ context: fileExplorerContext })
  accessor fileExplorerContextValue: FileExplorerContext = createFileExplorerContextValue({
    parentContext: undefined,
    context: undefined,
    subject: undefined
  })

  @query('source-pane-source-editor-card')
  private accessor editorCard: SourceEditorCard | null = null

  private loadContentAndMetadata = async () => {
    try {
      if (!this.context) {
        throw new Error('The element is missing the required `context` property.')
      }
      if (!this.subject) {
        throw new Error('The element is missing the required `subject` property.')
      }

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
      originalContent: this.originalContent,
      sourcePaneState: this.sourcePaneState,
      editorMetadata: this.editorMetadata,
      updateSourcePaneState: this.updateSourcePaneState,
      updateMetadata: this.updateEditorMetadata,
    })
  }

  private refreshFileExplorerContextValue() {
    this.fileExplorerContextValue = createFileExplorerContextValue({
      parentContext: this.parentFileExplorerContext,
      context: this.context,
      subject: this.subject
    })
  }

  updateSourcePaneState = <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => {
    this.sourcePaneState = {
      ...this.sourcePaneState,
      [key]: value
    }
  }

  updateEditorMetadata = (metadata: EditorMetadata) => {
    this.editorMetadata = {
      contentType: metadata.contentType,
      eTag: metadata.eTag
    }
  }

  beginEditing = () => {
    this.editorCard?.beginEditing()
  }

  protected async firstUpdated() {
    await this.loadContentAndMetadata()
  }

  protected willUpdate (changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties)
    if (!this.context) {
      throw new Error('The element is missing the required `context` property.')
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subject') ||
      changedProperties.has('originalContent') ||
      changedProperties.has('sourcePaneState') ||
      changedProperties.has('editorMetadata')
    ) {
      this.refreshSourceContextValue()
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subject') ||
      changedProperties.has('parentFileExplorerContext')
    ) {
      this.refreshFileExplorerContextValue()
    }
  }

  render() {
    return html`
      ${this.dataLoaded
        ? html`
            <source-pane-source-editor-card></source-pane-source-editor-card>
          `
        : nothing }
    `
  }
}
