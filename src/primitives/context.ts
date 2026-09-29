import { createContext } from '@lit/context'
import { EditorMetadata, SourcePaneState } from '../types'

export interface SourceContext {
  originalContent: string | undefined,
  sourcePaneState: SourcePaneState,
  editorMetadata: EditorMetadata,
  updateSourcePaneState: <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => void,
  updateMetadata: (metadata: EditorMetadata) => void,
}

export const sourceContext = createContext<SourceContext>(Symbol('source'))
