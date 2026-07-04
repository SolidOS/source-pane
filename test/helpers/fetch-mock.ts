import { vi } from 'vitest'

type FetchHandler = (request: Request) => Response | Promise<Response> | Record<string, unknown> | Promise<Record<string, unknown>>

type FetchMockEntry = {
  pattern: RegExp
  handler: FetchHandler
}

const handlers: FetchMockEntry[] = []

function toHeaders (headers: Headers | Record<string, string> | undefined) {
  if (headers instanceof Headers) return headers
  return new Headers(headers)
}

function toResponse (result: Response | Promise<Response> | Record<string, unknown>): Response | Promise<Response> {
  if (result instanceof Response || result instanceof Promise) {
    return result
  }

  const status = typeof result.status === 'number' ? result.status : 200
  const body = typeof result.body === 'string' ? result.body : ''
  const headers = toHeaders(result.headers as Record<string, string> | undefined)

  return new Response(body, { status, headers })
}

export function mockFetchIf (pattern: RegExp, handler: FetchHandler): void {
  handlers.push({ pattern, handler })
}

export function enableFetchMocks (): void {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)

    for (const { pattern, handler } of handlers) {
      if (pattern.test(request.url)) {
        return toResponse(await handler(request))
      }
    }

    return new Response('Not Found', { status: 404 })
  }))
}

export function resetFetchMocks (): void {
  handlers.length = 0
  vi.unstubAllGlobals()
}
