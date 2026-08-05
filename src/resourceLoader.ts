import { ns } from 'solid-ui'
import { log } from './debug'
import { EditorMetadata } from './types'
import { LiveStore, NamedNode } from 'rdflib'
import { happy } from './helpers'

export function getResponseMetadata (store: LiveStore, subject: NamedNode, response: Response): EditorMetadata {
  let contentType: string | undefined
  let eTag: string | undefined

  if (response.headers && response.headers.get('content-type')) {
    contentType = response.headers.get('content-type')?.split(';')[0] ?? undefined // Should work but headers may be empty
    eTag = response.headers.get('etag') ?? undefined
  } else {
    const reqs = store.each(
      null,
      store.sym('http://www.w3.org/2007/ont/link#requestedURI'),
      subject
    )
    reqs.forEach((req: any) => {
      const responseNode = store.any(
        req as any,
        store.sym('http://www.w3.org/2007/ont/link#response')
      )
      if (responseNode && responseNode.termType === 'NamedNode') {
        contentType = store.anyValue(responseNode as any, ns.httph('content-type')) || undefined
        eTag = store.anyValue(responseNode as any, ns.httph('etag')) || undefined
        if (!eTag) log('sourcePane: No eTag on GET')
      }
    })
  }

  return { contentType, eTag } as EditorMetadata
}

export async function fetchContentAndMetadata(store: LiveStore, subject: NamedNode): Promise<{ content: string, metadata: EditorMetadata }> {
  const fetcher = store.fetcher

  try {
    const response = await fetcher.webOperation('GET', subject.uri)
    if (!happy(response, 'GET')) {
      throw new Error('GET request failed')
    }

    const content = (response as Response & { responseText?: string }).responseText
    if (content === undefined) { // Defensive https://github.com/linkeddata/rdflib.js/issues/506
      throw new Error('source pane: No text in response object!!')
    }

    const metadata = getResponseMetadata(store, subject, response)
    if (!metadata.contentType) {
      throw new Error('Error: No content-type available!')
    }
    return { content, metadata }
  } catch (error: any) {
    throw new Error(`Error reading file: ${error.message}`)
  }

}
