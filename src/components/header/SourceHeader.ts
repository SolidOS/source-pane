import { WebComponent } from 'solid-ui'
import { customElement } from 'lit/decorators.js'
import { html } from 'lit'
import 'solid-ui/components/button'
import { consume } from '@lit/context'
import { sourceContext, SourceContext } from '../../primitives/context'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import '~icons/lucide/ellipsis-vertical'
import styles from './SourceHeader.styles.css'
import './SourceHeaderInfo'
import './SourceHeaderControls'

@customElement('source-pane-source-header')
export default class SourceHeader extends WebComponent {
  static styles = styles

  @consume({ context: sourceContext, subscribe: true })
  accessor sourceContext: SourceContext = undefined as unknown as SourceContext

  render () {
    return html`
      <header>
        <source-pane-source-header-info></source-pane-source-header-info>
        <source-pane-source-header-controls></source-pane-source-header-controls>
      </header>
    `
  }
}
