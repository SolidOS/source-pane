import { DataBrowserContext } from 'pane-registry'
import { createContext } from '@lit/context'
import { SourcePaneState } from '../types'

export interface SourceContext {
  context: DataBrowserContext,
  readonly subject: string,
  sourcePaneState: SourcePaneState,
  updateSourcePaneState: <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => void
}

export const sourceContext = createContext<SourceContext>(Symbol('source'))
