import { graph, sym } from 'rdflib'
import { vi } from 'vitest'

const webOperationMocks = []

function toHeaders (headers) {
  if (headers instanceof Headers) return headers
  return new Headers(headers)
}

function toResponse (result = {}) {
  return new Response(result.body ?? '', {
    status: typeof result.status === 'number' ? result.status : (result.ok === false ? 404 : 200),
    headers: toHeaders(result.headers)
  })
}

function matches (pattern, url) {
  return typeof pattern === 'string' ? pattern === url : pattern.test(url)
}

function createFetchMock () {
  return {
    requested: Object.create(null),
    initFetchOptions: vi.fn(() => ({})),
    webOperation: vi.fn(async (method, url, options) => {
      const matchIndex = webOperationMocks.findIndex((entry) => matches(entry.pattern, url))
      if (matchIndex >= 0) {
        const [entry] = webOperationMocks.splice(matchIndex, 1)
        const handler = entry.handler
        const result = typeof handler === 'function'
          ? await handler(method, url, options)
          : handler

        const response = toResponse(result)
        Object.defineProperty(response, 'responseText', {
          configurable: true,
          value: result.responseText ?? result.body ?? ''
        })
        return response
      }

      const response = toResponse({ ok: false, status: 404, responseText: 'Not Found' })
      Object.defineProperty(response, 'responseText', {
        configurable: true,
        value: 'Not Found'
      })
      return response
    })
  }
}

function mockWebOperationOnceIf (pattern, handler) {
  webOperationMocks.push({ pattern, handler })
}

const store = graph()
store.sym = sym
store.findTypeURIs = vi.fn(() => ({}))
store.removeDocument = vi.fn(() => undefined)
store.each = vi.fn(() => [])
store.any = vi.fn(() => null)
store.anyValue = vi.fn(() => null)
store.fetcher = createFetchMock()

const doc = document
const subject = sym('https://janedoe.example/test.ttl')
const context = {
  dom: document,
  session: {
    store
  }
}

export {
  mockWebOperationOnceIf,
  doc,
  subject,
  context
}
