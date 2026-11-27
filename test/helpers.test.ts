import { describe, expect, it, vi } from 'vitest'
import { graph, sym } from 'rdflib'
import { html, render } from 'lit'
import { checkSyntax, happy, setControlVisible } from '../src/helpers'

function createStatusRoot () {
  const root = document.createElement('div')
  render(html`<section class="sourcePaneStatus" data-visible="false"></section>`, root)
  document.body.append(root)
  return root
}

function createStore () {
  const store = graph() as any
  store.fetcher = { requested: {} }
  store.removeDocument = vi.fn()
  return store
}

describe('source-pane helpers', () => {
  it('reports successful and failed HTTP responses through the status section', () => {
    const root = createStatusRoot()

    expect(happy(new Response('', { status: 200 }), 'PUT', root)).toBe(true)
    expect(root.querySelector<HTMLElement>('.sourcePaneStatus')?.dataset.visible).toBe('false')

    expect(happy(new Response('', { status: 500 }), 'PUT', root)).toBe(false)
    expect(root.querySelector<HTMLElement>('.sourcePaneStatus')?.dataset.visible).toBe('true')

    expect(happy(new Response('', { status: 412 }), 'PUT', root)).toBe(false)
    expect(root.querySelector<HTMLElement>('.sourcePaneStatus')?.dataset.visible).toBe('true')
  })

  it('accepts unsupported content and valid JSON without parsing errors', () => {
    const store = createStore()
    const subject = sym('https://example.test/data.json')

    expect(checkSyntax(store, subject, 'not checked', 'text/plain', subject)).toBe(true)
    expect(checkSyntax(store, subject, '{"valid":true}', 'application/json', subject)).toBe(true)
  })

  it('reports invalid JSON and RDF syntax errors', () => {
    const root = createStatusRoot()
    const store = createStore()
    const subject = sym('https://example.test/data.ttl')

    expect(checkSyntax(store, subject, '{invalid', 'application/json', subject, root)).toBe(false)
    expect(root.querySelector('solid-ui-error-state')).not.toBeNull()

    expect(checkSyntax(store, subject, 'not valid turtle', 'text/turtle', subject, root)).toBe(false)
    expect(root.querySelector('solid-ui-error-state')).not.toBeNull()
  })

  it('extracts HTML data islands before validating RDF content', () => {
    const store = createStore()
    const subject = sym('https://example.test/page.html')
    const data = '<script type="text/turtle"><> <https://example.test/name> "Alice".</script>'

    expect(checkSyntax(store, subject, data, 'text/html', subject)).toBe(true)
    expect(checkSyntax(store, subject, '<html><body>No data island</body></html>', 'text/html', subject)).toBe(true)
  })

  it('handles JSON-LD validation and special store removal errors', () => {
    const root = createStatusRoot()
    const store = createStore()
    const subject = sym('https://example.test/data.jsonld')
    store.removeDocument.mockImplementationOnce(() => {
      throw new Error('Statement to be removed is not on store')
    })

    expect(checkSyntax(store, subject, '{"@id":"relative"}', 'application/ld+json', subject, root)).toBe(true)
    expect(store.removeDocument).toHaveBeenCalled()

    store.removeDocument.mockImplementationOnce(() => {
      throw new Error('unexpected store failure')
    })
    expect(checkSyntax(store, subject, '<>', 'text/turtle', subject, root)).toBe(false)
  })

  it('toggles control visibility and ignores missing controls', () => {
    const button = document.createElement('button')

    setControlVisible(null, true)
    setControlVisible(button, true)
    expect(button.className).toBe('sourcePaneControlVisible')

    setControlVisible(button, false)
    expect(button.className).toBe('sourcePaneControlHidden')
  })
})
