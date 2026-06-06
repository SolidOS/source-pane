import { html } from 'lit'
import { ref } from 'lit/directives/ref.js'
import { parse, serialize, NamedNode, LiveStore } from 'rdflib'
import { widgets, icons } from 'solid-ui'
import { getStatusSection } from './StatusSection'
import { applyResponseHeaders, checkSyntax, getResponseHeaders, happy, refresh, setControlVisible, setEdited, setUnedited } from './helpers'
import { SourcePaneState } from './types'
import { compactable } from './compactableFormats'
import SourceEditor from './components/sourceEditor/SourceEditor'

function mountButton (host: HTMLElement, button: HTMLElement) {
  host.replaceChildren(button)
}

export function renderHeader (store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState) {
  async function saveBack (store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState) {
    const fetcher = store.fetcher
    const editor = document.querySelector('source-editor') as SourceEditor | null
    const textArea = editor?.getTextArea()
    if (!textArea) return
    const data = textArea.value
    const { contentType, eTag } = sourcePaneState
    if (!checkSyntax(store, subject, data, contentType, subject)) {
      setEdited(sourcePaneState, textArea)
      const { showError } = getStatusSection()
      showError('Syntax error: fix the document before saving.')
      return
    }
    const options: { data: string; contentType: string | undefined; headers?: { 'if-match': string } } = { data, contentType }
    if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412
    try {
      const response = await fetcher.webOperation('PUT', subject.uri, options)
      if (!happy(response, 'PUT')) return
      /// @@ show edited: make save button disabled until edited again.
      try {
        const response = await fetcher.webOperation('HEAD', subject.uri) // , defaultFetchHeaders())
        if (!happy(response, 'HEAD')) return
        applyResponseHeaders(sourcePaneState, getResponseHeaders(store, subject, response))
        setUnedited(subject, sourcePaneState, textArea)
      } catch (err) {
        throw err
      }
    } catch (err: any) {
      const { showError } = getStatusSection()
      showError('Error saving back: ' + err)
    }
  }

  function setEditable (sourcePaneState: SourcePaneState) {
    const editor = document.querySelector('source-editor') as SourceEditor | null
    const textArea = editor?.getTextArea()
    const cancelButton = document.querySelector('.sourcePaneCancelButton') as HTMLElement
    const saveButton = document.querySelector('.sourcePaneSaveButton') as HTMLElement
    const myEditButton = document.querySelector('.sourcePaneEditButton') as HTMLElement
    const myCompactButton = document.querySelector('.sourcePaneCompactButton') as HTMLElement
    if (sourcePaneState.broken) return
    sourcePaneState.editing = true
    setControlVisible(cancelButton, true) // not logically needed but may be comforting
    setControlVisible(saveButton, false)
    setControlVisible(myEditButton, false)
    setControlVisible(myCompactButton, false) // do not allow compact while editing
    if (textArea) textArea.removeAttribute('readonly')
    editor?.focusEditor()  
  }

  function compactHandler (store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState) {
    const { contentType } = sourcePaneState
    const compactContentType = contentType?.split(';')[0]
    const editor = document.querySelector('source-editor') as SourceEditor | null
    const textArea = editor?.getTextArea()
    const cancelButton = document.querySelector('.sourcePaneCancelButton') as HTMLElement
    const { showError } = getStatusSection()

    if (compactContentType && compactable[compactContentType]) {
      try {
        parse(textArea.value, store, subject.uri, compactContentType)
        // for jsonld serialize which is a Promise. New rdflib
        const serialized = Promise.resolve(serialize(store.sym(subject.uri), store, subject.uri, compactContentType))
        serialized.then(result => {
          if (typeof result === 'string') textArea.value = result /*return div*/
        })
        setControlVisible(cancelButton, true)
      } catch (e: any) {  
        showError(String(e))
      }
    }
  }

  return html`
    <header class="sourcePaneHeader sourcePaneControls">
      <span class="sourcePaneControlHost" ${ref((host: Element | undefined) => {
        if (host instanceof HTMLElement) {
          mountButton(host, createEditButton(host.ownerDocument, () => setEditable(sourcePaneState)))
        }
      })}></span>
      <span class="sourcePaneControlHost" ${ref((host: Element | undefined) => {
        if (host instanceof HTMLElement) {
          mountButton(host, createCompactButton(host.ownerDocument, () => compactHandler(store, subject, sourcePaneState)))

        }
      })}></span>
      <span class="sourcePaneControlHost" ${ref((host: Element | undefined) => {
        if (host instanceof HTMLElement) {
          mountButton(host, createCancelButton(host.ownerDocument, () => refresh(store, subject, sourcePaneState)))
        }
      })}></span>
      <span class="sourcePaneControlHost" ${ref((host: Element | undefined) => {
        if (host instanceof HTMLElement) {
          mountButton(host, createSaveButton(host.ownerDocument, () => saveBack(store, subject, sourcePaneState)))
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

export function createCompactButton (dom: Document, onClick?: EventListener) {
  const myCompactButton = widgets.button(
    dom,
    undefined,
    'Compact',
    { needsBorder: true }
  )
  myCompactButton.classList.add('sourcePaneCompactButton')
  if (onClick) {
    myCompactButton.addEventListener('click', onClick)
  }
  return myCompactButton
}

export function createCancelButton (dom: Document, onClick?: EventListener) {
  const myCancelButton = widgets.cancelButton(dom)
  myCancelButton.classList.add('sourcePaneCancelButton')
  if (onClick) {
    myCancelButton.addEventListener('click', onClick)
  }
  return myCancelButton
}

export function createSaveButton (dom: Document, onClick?: EventListener) {
  const mySaveButton = widgets.continueButton(dom)
  mySaveButton.classList.add('sourcePaneSaveButton')
  if (onClick) {
    mySaveButton.addEventListener('click', onClick)
  }
  return mySaveButton
}
