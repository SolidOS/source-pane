import { utils, WebComponent } from 'solid-ui'
import { customElement } from 'lit/decorators.js'
import { html } from 'lit'
import { consume } from '@lit/context'
import { sym } from 'rdflib'
import { sourceContext, SourceContext } from '../../primitives/context'
import '~icons/lucide/globe'
import '~icons/lucide/lock'
import styles from './SourceHeaderInfo.styles.css'
import { sourcePaneIcon } from '../../icons/sourcePaneIcon'

@customElement('source-pane-source-header-info')
export default class SourceHeaderInfo extends WebComponent {
  static styles = styles

  @consume({ context: sourceContext, subscribe: true })
  accessor sourceContext: SourceContext = undefined as unknown as SourceContext

  private accessor isPublic: boolean = false
  private accessor publicStateForSubject: string | undefined = undefined

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
    const modified = this.formatModifiedDate(this.sourceContext?.sourcePaneState.modified)

    if (subject && this.publicStateForSubject !== subject.uri) {
      this.publicStateForSubject = subject.uri
      void this.sourceContext?.accessControlService?.isPublic(subject)
        .then((isPublic) => {
          this.isPublic = isPublic
          this.requestUpdate()
        })
        .catch(() => {
          this.isPublic = false
          this.requestUpdate()
        })
    }

    return html`
      <div class="source-pane-header-info">
        <span class="source-pane-icon">${sourcePaneIcon}</span>
        <div>
          <h1>${label}</h1>
          <p>${modified} ${this.isPublic ? html`<icon-lucide-globe></icon-lucide-globe> Public` : html`<icon-lucide-lock></icon-lucide-lock> Private`}</p>
        </div>
      </div>
    `
  }
}
