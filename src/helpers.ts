import { LiveStore, NamedNode, parse, serialize } from 'rdflib'
import { getStatusSection } from './StatusSection'
import { error } from './debug'

const parseable: Record<string, boolean> = {
  'text/n3': true,
  'text/turtle': true,
  'application/rdf+xml': true,
  'application/xhtml+xml': true, // For RDFa?
  'text/html': true, // For data island
  'application/json': true,
  'application/ld+json': true
}

export function happy (response: Response, method: string, root: ParentNode = document) {
  if (!response.ok) {
    let msg = 'HTTP error on ' + method + '! Status: ' + response.status
    error(msg)
    if (response.status === 412) msg = 'Error: File changed by someone else'
    const { showError } = getStatusSection(root)
    showError(msg)
  }
  return response.ok
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

export function checkSyntax (
  store: LiveStore,
  subject: NamedNode,
  data: string,
  contentType: string | undefined,
  base: NamedNode,
  root: ParentNode = document
) {
  const fetcher = store.fetcher
  const { showError, clearError } = getStatusSection(root)

  clearError()
  if (!contentType || !parseable[contentType]) return true // don't check things we don't understand
  if (contentType === 'text/html') {
    [data, contentType] = HTMLDataIsland(data)
    if (!contentType) return true
  }
  try {
    if (contentType === 'application/json') {
      JSON.parse(data)
      return true
    } else {
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
    let message = e.message
    let cause: any = e
    while (cause && cause.cause) {
      cause = cause.cause
      if (cause && typeof cause.characterInFile === 'number') {
        message = `${message} (at character ${cause.characterInFile})`
      }
    }
    showError(message)
    return false
  }
  return true
}

export function setControlVisible (button: HTMLElement | null, visible: boolean) {
  if (!button) return
  button.classList.toggle('sourcePaneControlVisible', visible)
  button.classList.toggle('sourcePaneControlHidden', !visible)
}
