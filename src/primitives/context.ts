import { DataBrowserContext } from 'pane-registry'
import { createContext } from '@lit/context'
import { EditorMetadata, HeaderMetadata, SourcePaneState, ResourceMetadata } from '../types'

export interface SourceContext {
  context: DataBrowserContext,
  readonly subject: string,
  originalContent: string | undefined,
  sourcePaneState: SourcePaneState,
  headerMetadata: HeaderMetadata,
  editorMetadata: EditorMetadata,
  updateSourcePaneState: <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => void,
  updateMetadata: (metadata: ResourceMetadata) => void,
  setEditing: () => void
}

export const sourceContext = createContext<SourceContext>(Symbol('source'))
