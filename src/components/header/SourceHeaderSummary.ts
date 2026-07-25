import { utils, WebComponent } from 'solid-ui'
import 'solid-ui/components/button'
import { customElement } from 'lit/decorators.js'
import { html } from 'lit'
import { consume } from '@lit/context'
import { sym } from 'rdflib'
import { sourceContext, SourceContext } from '../../primitives/context'
import '~icons/lucide/globe'
import '~icons/lucide/lock-keyhole'
import '~icons/lucide/arrow-left'
import styles from './SourceHeaderSummary.styles.css'
import { sourcePaneIcon } from '../../icons/sourcePaneIcon'

@customElement('source-pane-source-header-summary')
export default class SourceHeaderSummary extends WebComponent {
  static styles = styles

  @consume({ context: sourceContext, subscribe: true })
  accessor sourceContext: SourceContext = undefined as unknown as SourceContext

  private formatModifiedDate (modified: string | undefined) {
    if (!modified) return ''

    const date = new Date(modified)
    if (Number.isNaN(date.getTime())) return modified

    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date)

    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
    const day = getPart('day')
    const month = getPart('month')
    const year = getPart('year')
    const hour = getPart('hour')
    const minute = getPart('minute')
    const dayPeriod = getPart('dayPeriod').toUpperCase()

    return `${day} ${month}, ${year} at ${hour}:${minute} ${dayPeriod}`
  }

  render () {
    const subject = this.sourceContext?.subject ? sym(this.sourceContext.subject) : undefined
    const label = subject ? utils.label(subject) : ''
    const modified = this.formatModifiedDate(this.sourceContext?.headerMetadata?.modified)
    const isPublic = this.sourceContext?.headerMetadata?.isPublic ?? false

    return html`
      <div class="source-pane-header-summary">
        <solid-ui-button
          variant="ghost">
          <icon-lucide-arrow-left></icon-lucide-arrow-left>
        </solid-ui-button>
        <span class="source-pane-icon">${sourcePaneIcon}</span>
        <div>
          <h1>${label}</h1>
          <p>${modified} ${isPublic ? html`<span class="source-pane-public"><icon-lucide-globe></icon-lucide-globe> Public</span>` : html`<span class="source-pane-private"><icon-lucide-lock-keyhole></icon-lucide-lock-keyhole> Private</span>`}</p>
        </div>
      </div>
    `
  }
}
