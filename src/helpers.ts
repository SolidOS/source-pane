import { LiveStore, NamedNode, parse, serialize } from 'rdflib'
import { getStatusSection } from './StatusSection'
import { error, log } from './debug'
import { ns } from 'solid-ui'
import { HttpResourceMetadata, SourcePaneState } from './types'
import { compactable } from './compactableFormats'

const parseable: Record<string, boolean> = {
  'text/n3': true,
  'text/turtle': true,
  'application/rdf+xml': true,
  'application/xhtml+xml': true, // For RDFa?
  'text/html': true, // For data island
  //        'application/sparql-update': true,
  'application/json': true,
  'application/ld+json': true
  //        'application/nquads' : true,
  //        'application/n-quads' : true
}

export function happy (response: Response, method: string) {
  if (!response.ok) {
    let msg = 'HTTP error on ' + method + '! Status: ' + response.status
    error(msg)
    if (response.status === 412) msg = 'Error: File changed by someone else'
    const { showError } = getStatusSection()
    showError(msg)
  }
  return response.ok
}

/** Set Caret position in a text box
* @param {Element} elem - the element to be tweaked
* @param {Integer} caretPos - the poisition starting at zero
* @credit  https://stackoverflow.com/questions/512528/set-keyboard-caret-position-in-html-textbox
*/
function setCaretPosition (elem: HTMLTextAreaElement, cause: { characterInFile: number, lineNo?: number }) {
  if (elem != null) {
    if (cause.characterInFile === -1 && cause.lineNo) cause.lineNo += 1
    const pos = cause.lineNo ? elem.value.split('\n', cause.lineNo).join('\n').length : 0
    const caretPos = pos + cause.characterInFile
    const textArea = elem as HTMLTextAreaElement & { createTextRange?: () => any }
    if (textArea.createTextRange) {
      const range = textArea.createTextRange()
      range.move('character', caretPos)
      range.select()
    } else {
      elem.focus()
      if (elem.selectionStart) {
        elem.setSelectionRange(caretPos, caretPos)
      }
    }
  }
}

function HTMLDataIsland (data: string): [string, string] {
  let dataIslandContentType = ''
  let dataIsland = ''
  const scripts = data.split('</script')
  if (scripts && scripts.length) {
    for (let script of scripts) {
      script = '<script' + script.split('<script')[1] + '</script>'
      const RDFType = ['text/turtle', 'text/n3', 'application/ld+json', 'application/rdf+xml']
      const contentType = RDFType.find(type => script.includes(`type="${type}"`))
      if (contentType) {
        dataIsland = script.replace(/^<script(.*?)>/gm, '').replace(/<\/script>$/gm, '')
        dataIslandContentType = contentType
        break
      }
    }
  }
  return [dataIsland, dataIslandContentType]
}

function setTextState (stateClass: string) {
  const textArea = document.querySelector('.sourcePaneTextArea') as HTMLTextAreaElement
  textArea.classList.remove(
    'sourcePaneTextAreaUnedited',
    'sourcePaneTextAreaEditing',
    'sourcePaneTextAreaEdited',
    'sourcePaneTextAreaError'
  )
  textArea.classList.add(stateClass)
}

export function checkSyntax (store: LiveStore, subject: NamedNode, data: string, contentType: string | undefined, base: NamedNode) {
  const fetcher = store.fetcher
  const { showError, clearError } = getStatusSection()
  const textArea = document.querySelector('.sourcePaneTextArea') as HTMLTextAreaElement
  
  if (!showError || !clearError) return true
  if (!contentType || !parseable[contentType]) return true // don't check things we don't understand
  if (contentType === 'text/html') {
    [data, contentType] = HTMLDataIsland(data)
    if (!contentType) return true
  }
  try {
    clearError()
    if (contentType === 'application/json') return JSON.parse(data)
    else {
      try {
        store.removeDocument(subject)
      } catch (err: any) {
        // this is a hack until issue is resolved in rdflib
        if (!(err instanceof Error) || !err.message.includes('Statement to be removed is not on store')) throw err
        error(err)
      }
      delete fetcher.requested[subject.value]
      // rdflib parse jsonld do not return parsing errors
      if (contentType === 'application/ld+json') {
        JSON.parse(data)
        parse(data, store, base.uri, contentType, (err: any, res: any) => {
          if (err) throw err
          const serialized = serialize(base as any, res as any, base.uri, contentType)
          if (typeof serialized === 'string' && data.includes('@id') && !serialized.includes('@id')) {
            const e = new Error('Invalid jsonld : predicate do not expand to an absolute IRI')
            showError(e.message)
            // throw e
            return false
          }
          return true
        })
      } else {
        parse(data, store, base.uri, contentType)
      }
    }
    return true
  } catch (e: any) {
    showError(e.message)
    let cause: any = e
    while (cause && cause.cause) {
      cause = cause.cause
      if (cause && cause.characterInFile) {
        setCaretPosition(textArea, cause)
      }
    }
    return false
  }
  return true
}

export function setControlVisible (button: HTMLElement | null, visible: boolean) {
  if (!button) return
  button.classList.toggle('sourcePaneControlVisible', visible)
  button.classList.toggle('sourcePaneControlHidden', !visible)
}

export function setUnedited (subject: NamedNode, sourcePaneState: SourcePaneState) {
  const textArea = document.querySelector('.sourcePaneTextArea') as HTMLTextAreaElement
  const cancelButton = document.querySelector('.sourcePaneCancelButton') as HTMLElement
  const saveButton = document.querySelector('.sourcePaneSaveButton') as HTMLElement
  const myEditButton = document.querySelector('.sourcePaneEditButton') as HTMLElement
  const myCompactButton = document.querySelector('.sourcePaneCompactButton') as HTMLElement
  const { broken, readonly, contentType } = sourcePaneState
  if (broken) return
  sourcePaneState.editing = false
  setControlVisible(myEditButton, !readonly && !subject.uri.endsWith('/'))
  setControlVisible(cancelButton, true)
  setControlVisible(saveButton, false)
  setControlVisible(myCompactButton, !!(contentType && compactable[contentType.split(';')[0]]))
  setTextState('sourcePaneTextAreaUnedited')
  textArea.setAttribute('readonly', 'true')
}

export function setEdited (sourcePaneState: SourcePaneState) {
  const { showError } = getStatusSection()
  const cancelButton = document.querySelector('.sourcePaneCancelButton') as HTMLElement
  const saveButton = document.querySelector('.sourcePaneSaveButton') as HTMLElement
  const myEditButton = document.querySelector('.sourcePaneEditButton') as HTMLElement
  const myCompactButton = document.querySelector('.sourcePaneCompactButton') as HTMLElement
  const textArea = document.querySelector('.sourcePaneTextArea') as HTMLTextAreaElement
  sourcePaneState.editing = true
  showError('Unsaved changes')
  if (sourcePaneState.broken || !sourcePaneState.editing) return
  setControlVisible(cancelButton, true)
  setControlVisible(saveButton, true)
  setControlVisible(myEditButton, false)
  setControlVisible(myCompactButton, false)
  setTextState('sourcePaneTextAreaEdited')
  textArea.removeAttribute('readonly')
}

export function applyResponseHeaders (sourcePaneState: SourcePaneState, metadata: HttpResourceMetadata) {
  sourcePaneState.contentType = metadata.contentType
  sourcePaneState.allowed = metadata.allowed
  sourcePaneState.eTag = metadata.eTag
}

// get response headers
export function getResponseHeaders (store: LiveStore, subject: NamedNode, response: Response): HttpResourceMetadata {
  let contentType: string | undefined
  let allowed: string | undefined
  let eTag: string | undefined
  if (response.headers && response.headers.get('content-type')) {
    contentType = response.headers.get('content-type')?.split(';')[0] ?? undefined // Should work but headers may be empty
    allowed = response.headers.get('allow') ?? undefined //     const cts = store.fetcher.getHeader(subject.doc(), 'content-type')
    eTag = response.headers.get('etag') ?? undefined
  } else {
    const reqs = store.each(
      null,
      store.sym('http://www.w3.org/2007/ont/link#requestedURI'),
      subject as any
    )
    reqs.forEach((req: any) => {
      const rrr = store.any(
        req as any,
        store.sym('http://www.w3.org/2007/ont/link#response')
      )
      if (rrr && rrr.termType === 'NamedNode') {
        contentType = store.anyValue(rrr as any, ns.httph('content-type')) || undefined
        allowed = store.anyValue(rrr as any, ns.httph('allow')) || undefined
        eTag = store.anyValue(rrr as any, ns.httph('etag')) || undefined
        if (!eTag) log('sourcePane: No eTag on GET')
      }
    })
  }
  return { contentType, allowed, eTag }
}

export function refresh (store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState) {
  // see https://github.com/linkeddata/rdflib.js/issues/629
  // const options = defaultFetchHeaders()
  const fetcher = store.fetcher
  const { showError } = getStatusSection()

  fetcher
    .webOperation('GET', subject.uri) // , options)
    .then(function (response: Response) {
      if (!happy(response, 'GET')) return
      const desc = (response as Response & { responseText?: string }).responseText
      if (desc === undefined) { // Defensive https://github.com/linkeddata/rdflib.js/issues/506
        const msg = 'source pane: No text in response object!!'
        showError(msg)
        return // Never mis-represent the contents of the file.
      }
      const textArea = document.querySelector('.sourcePaneTextArea') as HTMLTextAreaElement | null
      if (!textArea) {
        showError('Error reading file: source text area is not mounted.')
        return
      }
      textArea.rows = desc.split('\n').length + 2
      textArea.value = desc

      const metadata = getResponseHeaders(store, subject, response)
      if (!metadata.contentType) {
        showError('Error: No content-type available!')
        return
      }
      applyResponseHeaders(sourcePaneState, metadata)
      if (!metadata.allowed) {
        error('@@@@@@@@@@ No Allow: header from this server')
      }
      setUnedited(subject, sourcePaneState)
    })
    .catch((err: any) => {
      showError('Error reading file: ' + err)
    })
}
