import { html } from 'lit'
import { LiveStore, NamedNode } from 'rdflib'
import { setEdited } from './helpers'
import { SourcePaneState } from './types'

export function renderSourceCard (store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState) {
  return html`
      <main class="sourcePaneMain">
        <textarea class="sourcePaneTextArea" @keyup=${() => setEdited(sourcePaneState)}></textarea>
      </main>
  `
}
