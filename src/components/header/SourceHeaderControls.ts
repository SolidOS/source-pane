import { WebComponent } from 'solid-ui'
import { customElement } from 'lit/decorators.js'
import { html } from 'lit'
import 'solid-ui/components/button'
import { consume } from '@lit/context'
import { sourceContext, SourceContext } from '../../primitives/context'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import '~icons/lucide/ellipsis-vertical'
import styles from './SourceHeaderControls.styles.css'
import './SourceHeaderInfo'

@customElement('source-pane-source-header-controls')
export default class SourceHeaderControls extends WebComponent {
  static styles = styles

  @consume({ context: sourceContext, subscribe: true })
  accessor sourceContext: SourceContext = undefined as unknown as SourceContext

  /* private canEditSource (subject: NamedNode, sourcePaneState: SourcePaneState) {
    const { allowed } = sourcePaneState
    return !subject.uri.endsWith('/') && (!allowed || allowed.includes('PUT'))
  } */

  private setEditable() {
    const sourcePaneState = this.sourceContext?.sourcePaneState
    if (!sourcePaneState || sourcePaneState.broken) return
    this.sourceContext?.setEditing?.()
  }

  render () {
    return html`
      <div>
        <solid-ui-button class="sourcePanePrettyButton" variant="ghost" title="Share">
          <icon-lucide-share-2 slot="icon"></icon-lucide-share-2>
        </solid-ui-button>
        <solid-ui-button class="sourcePanePrettyButton" variant="ghost" @click=${() => this.setEditable()}>
          <icon-lucide-pencil slot="icon"></icon-lucide-pencil>
        </solid-ui-button>
        <solid-ui-button class="sourcePanePrettyButton" variant="ghost" title="More options">
          <icon-lucide-ellipsis-vertical slot="icon"></icon-lucide-ellipsis-vertical>
        </solid-ui-button>
      </div>
    `
  }
}
