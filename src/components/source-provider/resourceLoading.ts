import type { LiveStore, NamedNode } from 'rdflib'

type ResourceMetadata = {
  contentType: string | undefined
  eTag: string | undefined
}

function assertSuccessfulHttpResponse(response: Response, method: string) {
  if (response.ok) return

  const message = response.status === 412
    ? 'Error: File changed by someone else'
    : `HTTP error on ${method}! Status: ${response.status}`
  throw new Error(message)
}

function readContentType(response: Response) {
  const contentTypeHeader = response.headers?.get('content-type')
  return contentTypeHeader?.split(';')[0] ?? undefined
}

export async function fetchContentAndMetadata(store: LiveStore, subject: NamedNode): Promise<{ content: string, metadata: ResourceMetadata }> {
  const response = await store.fetcher.webOperation('GET', subject.uri)
  assertSuccessfulHttpResponse(response, 'GET')

  const content = (response as Response & { responseText?: string }).responseText
  if (content === undefined) {
    throw new Error('No text in response object!!')
  }

  return {
    content,
    metadata: {
      contentType: readContentType(response),
      eTag: response.headers?.get('etag') ?? undefined
    }
  }
}

export async function fetchMetadata(store: LiveStore, subject: NamedNode): Promise<ResourceMetadata> {
  const response = await store.fetcher.webOperation('HEAD', subject.uri)
  assertSuccessfulHttpResponse(response, 'HEAD')

  return {
    contentType: readContentType(response),
    eTag: response.headers?.get('etag') ?? undefined
  }
}