import { html } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { NamedNode, LiveStore } from 'rdflib'
import { widgets, icons } from 'solid-ui'
import { SourcePaneState } from './types'
import SourceEditorCard from './components/sourceEditorCard/SourceEditorCard'

/* This we will use in the header ticket, didn't want to lose the code */
export function canEditSource (subject: NamedNode, sourcePaneState: SourcePaneState) {
  const { allowed } = sourcePaneState
  return !subject.uri.endsWith('/') && (!allowed || allowed.includes('PUT'))
}

function mountButton (host: HTMLElement, button: HTMLElement) {
  host.replaceChildren(button)
}

export function renderHeader (store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState) {
  
  function setEditable (sourcePaneState: SourcePaneState) {
    if (sourcePaneState.broken) return
    const editorCard = document.querySelector('solid-panes-source-editor-card') as SourceEditorCard | null
    editorCard?.updateEditingState(true)
    editorCard?.setReadOnly(false)
    editorCard?.focusEditor()  
  }

  return html`
    <header class="sourcePaneHeader sourcePaneControls">
      <span class="sourcePaneControlHost" ${ref((host: Element | undefined) => {
        if (host instanceof HTMLElement) {
          mountButton(host, createEditButton(host.ownerDocument, () => setEditable(sourcePaneState)))
        }
      })}></span>
    </header>
  `
}

export function createEditButton (dom: Document, onClick?: EventListener) {
  const myEditButton = widgets.button(
    dom,
    icons.iconBase + 'noun_253504.svg',
    'Edit'
  )
  myEditButton.classList.add('sourcePaneEditButton')
  if (onClick) {
    myEditButton.addEventListener('click', onClick)
  }
  return myEditButton
}
