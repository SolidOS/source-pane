import { ns } from 'solid-ui'
import { getStatusSection } from './StatusSection'
import { error, log } from './debug'
import { HttpResourceMetadata, SourcePaneState } from './types'
import { LiveStore, NamedNode } from 'rdflib'
import { happy } from './helpers'

export function applyResponseHeaders (sourcePaneState: SourcePaneState, metadata: HttpResourceMetadata) {
  sourcePaneState.contentType = metadata.contentType
  sourcePaneState.allowed = metadata.allowed
  sourcePaneState.eTag = metadata.eTag
}

export function getResponseHeaders (store: LiveStore, subject: NamedNode, response: Response): HttpResourceMetadata {
  let contentType: string | undefined
  let allowed: string | undefined
  let eTag: string | undefined
  let title: string | undefined
  let modified: string | undefined

  if (response.headers && response.headers.get('content-type')) {
    contentType = response.headers.get('content-type')?.split(';')[0] ?? undefined // Should work but headers may be empty
    allowed = response.headers.get('allow') ?? undefined //     const cts = store.fetcher.getHeader(subject.doc(), 'content-type')
    eTag = response.headers.get('etag') ?? undefined
    title = store.anyValue(subject as any, ns.rdfs('label')) || store.anyValue(subject as any, ns.dct('title')) || undefined
    modified = store.anyValue(subject as any, ns.dct('modified')) || store.anyValue(subject as any, ns.dc('modified')) || undefined

  } else {
    const reqs = store.each(
      null,
      store.sym('http://www.w3.org/2007/ont/link#requestedURI'),
      subject
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
        title = store.anyValue(subject as any, ns.rdfs('label')) || store.anyValue(subject as any, ns.dct('title')) || undefined
        modified = store.anyValue(subject as any, ns.dct('modified')) || store.anyValue(subject as any, ns.dc('modified')) || undefined
        if (!eTag) log('sourcePane: No eTag on GET')
      }
    })
  }
  return { contentType, allowed, eTag, title, modified }
}

export async function fetchContentAndMetadata(store: LiveStore, subject: NamedNode, sourcePaneState: SourcePaneState): Promise<{ content: string, metadata: HttpResourceMetadata }> {
  const fetcher = store.fetcher
  const { showError } = getStatusSection()

  try {
    const response = await fetcher.webOperation('GET', subject.uri)
    if (!happy(response, 'GET')) {
      throw new Error('GET request failed')
    }

    const content = (response as Response & { responseText?: string }).responseText
    if (content === undefined) { // Defensive https://github.com/linkeddata/rdflib.js/issues/506
      throw new Error('source pane: No text in response object!!')
    }

    const metadata = getResponseHeaders(store, subject, response)
    if (!metadata.contentType) {
      throw new Error('Error: No content-type available!')
    }
    applyResponseHeaders(sourcePaneState, metadata)
    if (!metadata.allowed) {
      error('@@@@@@@@@@ No Allow: header from this server')
    }
    return { content, metadata }
  } catch (err: any) {
    showError('Error reading file: ' + err)
    throw err
  }
}
