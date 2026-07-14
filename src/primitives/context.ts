import { DataBrowserContext } from 'pane-registry'
import { createContext } from '@lit/context'
import { SourcePaneState } from '../types'
import { AccessControlService } from 'solid-ui'

export interface SourceContext {
  context: DataBrowserContext,
  readonly subject: string,
  accessControlService: AccessControlService,
  sourcePaneState: SourcePaneState,
  updateSourcePaneState: <K extends keyof SourcePaneState>(key: K, value: SourcePaneState[K]) => void,
  setEditing: () => void
}

export const sourceContext = createContext<SourceContext>(Symbol('source'))
