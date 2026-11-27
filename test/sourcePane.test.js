import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContextProvider } from '@lit/context'
import { fileExplorerContext } from 'solid-ui'

let sourcePane

beforeAll(async () => {
  await import('../src/components/source-provider/SourceProvider.ts')
  sourcePane = (await import('../src/sourcePane.ts')).default
})

function renderPaneIntoDocument () {
  const container = document.createElement('div')
  const fileExplorer = {
    store: {},
    subjectUri: 'https://janedoe.example/test.ttl',
    pane: undefined,
    isDirty: false,
    canEdit: true,
    registerEditor: vi.fn(() => vi.fn()),
    beginEditing: vi.fn(),
    setDirty: vi.fn()
  }
  new ContextProvider(container, {
    context: fileExplorerContext,
    initialValue: fileExplorer
  })
  document.body.appendChild(container)

  const store = { findTypeURIs: vi.fn(() => ({})) }
  const subject = { uri: 'https://janedoe.example/test.ttl' }
  const context = {
    dom: document,
    session: { store }
  }
  const rendered = sourcePane.render(subject, context)
  container.appendChild(rendered)
  return { container, fileExplorer, subject, store, rendered }
}

describe('source-pane', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it.each(['file.js', 'module.mjs', 'module.cjs', 'script.JS?version=1#test'])('offers and focuses Source for %s without MIME metadata', path => {
    const subject = { uri: new URL(path, 'https://example.test/').href }
    const context = { session: { store: { findTypeURIs: () => ({}) } } }
    expect(sourcePane.label(subject, context)).toBe('Javascript Source')
    expect(sourcePane.shouldGetFocus(subject)).toBe(true)
  })

  it.each([
    ['http://www.w3.org/ns/iana/media-types/text/plain#Resource', 'Source'],
    ['application/xml', 'XML Source'],
    ['application/json', 'JSON Source'],
    ['application/javascript', 'Javascript Source']
  ])('uses MIME metadata to label %s', (type, expectedLabel) => {
    const subject = { uri: 'https://example.test/resource' }
    const context = { session: { store: { findTypeURIs: () => ({ [type]: true }) } } }

    expect(sourcePane.label(subject, context)).toBe(expectedLabel)
  })

  it('does not offer Source when MIME metadata is not supported', () => {
    const subject = { uri: 'https://example.test/resource' }
    const context = { session: { store: { findTypeURIs: () => ({ 'application/octet-stream': true }) } } }

    expect(sourcePane.label(subject, context)).toBeNull()
  })

  it('does not focus Source for a folder named scripts.js/', () => {
    expect(sourcePane.shouldGetFocus({ uri: 'https://example.test/scripts.js/' })).toBe(false)
  })

  it('creates a file when the folder creation contract supplies a trailing slash', async () => {
    const newInstance = { uri: 'https://example.test/notes.ttl/' }
    const store = {
      sym: vi.fn(uri => ({ uri })),
      fetcher: {
        webOperation: vi.fn().mockResolvedValue(undefined)
      }
    }
    const options = {
      folder: { uri: 'https://example.test/' },
      newBase: newInstance.uri,
      newInstance,
      pane: sourcePane,
      noun: 'source',
      div: document.createElement('div'),
      dom: document,
      iconEle: document.createElement('img'),
      noIndexHTML: true
    }

    await sourcePane.mintNew({ session: { store } }, options)

    expect(store.sym).toHaveBeenCalledWith('https://example.test/notes.ttl')
    expect(store.fetcher.webOperation).toHaveBeenCalledWith('PUT', 'https://example.test/notes.ttl', {
      data: '\n',
      contentType: 'text/turtle'
    })
    expect(options.newInstance.uri).toBe('https://example.test/notes.ttl')
  })

  it('creates a file from an existing non-container resource instance', async () => {
    const newInstance = { uri: 'https://example.test/notes.txt' }
    const store = {
      sym: vi.fn(uri => ({ uri })),
      fetcher: { webOperation: vi.fn().mockResolvedValue(undefined) }
    }
    const options = {
      folder: { uri: 'https://example.test/' },
      newBase: newInstance.uri,
      newInstance,
      pane: sourcePane,
      noun: 'source',
      div: document.createElement('div'),
      dom: document,
      iconEle: document.createElement('img'),
      noIndexHTML: true
    }

    await sourcePane.mintNew({ session: { store } }, options)

    expect(store.sym).not.toHaveBeenCalled()
    expect(store.fetcher.webOperation).toHaveBeenCalledWith('PUT', newInstance.uri, {
      data: '\n',
      contentType: 'text/plain'
    })
  })

  it('normalizes a trailing slash in the requested base URI', async () => {
    const store = {
      sym: vi.fn(uri => ({ uri })),
      fetcher: { webOperation: vi.fn().mockResolvedValue(undefined) }
    }
    const options = {
      folder: { uri: 'https://example.test/' },
      newBase: 'https://example.test/notes.ttl/',
      newInstance: undefined,
      pane: sourcePane,
      noun: 'source',
      div: document.createElement('div'),
      dom: document,
      iconEle: document.createElement('img'),
      noIndexHTML: true
    }

    await sourcePane.mintNew({ session: { store } }, options)

    expect(store.sym).toHaveBeenCalledWith('https://example.test/notes.ttl')
    expect(options.newBase).toBe('https://example.test/notes.ttl')
  })

  it.each([
    ['data.json', '{}\n', 'application/json'],
    ['data.rdf', '<rdf:RDF\n xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n\n</rdf:RDF>', 'application/rdf+xml']
  ])('uses the correct starter content for %s', async (fileName, data, contentType) => {
    const store = {
      sym: vi.fn(uri => ({ uri })),
      fetcher: { webOperation: vi.fn().mockResolvedValue(undefined) }
    }
    const options = {
      folder: { uri: 'https://example.test/' },
      newBase: `https://example.test/${fileName}`,
      newInstance: undefined,
      pane: sourcePane,
      noun: 'source',
      div: document.createElement('div'),
      dom: document,
      iconEle: document.createElement('img'),
      noIndexHTML: true
    }

    await sourcePane.mintNew({ session: { store } }, options)

    expect(store.fetcher.webOperation).toHaveBeenCalledWith('PUT', `https://example.test/${fileName}`, {
      data,
      contentType
    })
  })

  it('rejects unsupported new file types and failed creation requests', async () => {
    const alert = vi.spyOn(globalThis, 'alert').mockImplementation(() => {})
    const store = {
      sym: vi.fn(uri => ({ uri })),
      fetcher: { webOperation: vi.fn().mockRejectedValue(new Error('creation failed')) }
    }
    const options = {
      folder: { uri: 'https://example.test/' },
      newBase: 'https://example.test/image.png',
      newInstance: undefined,
      pane: sourcePane,
      noun: 'source',
      div: document.createElement('div'),
      dom: document,
      iconEle: document.createElement('img'),
      noIndexHTML: true
    }

    expect(() => sourcePane.mintNew({ session: { store } }, options)).toThrow('file extension')
    expect(alert).toHaveBeenCalled()
    options.newBase = 'https://example.test/notes.ttl'
    options.newInstance = undefined
    await expect(sourcePane.mintNew({ session: { store } }, options)).rejects.toThrow('creation failed')
    alert.mockRestore()
  })

  it('loads and renders the source editor only after the source pane is selected', async () => {
    expect(customElements.get('source-pane-source-editor-card')).toBeUndefined()

    const { fileExplorer, rendered } = renderPaneIntoDocument()

    expect(rendered).not.toBeNull()
    expect(rendered.className).toBe('sourcePane')
    expect(rendered.getAttribute('class')).toBe('sourcePane')
    expect(rendered.querySelector('source-pane-source-provider')).not.toBeNull()
    expect(rendered.querySelector('source-pane-source-editor-card')).toBeNull()

    await customElements.whenDefined('source-pane-source-editor-card')
    await vi.waitFor(() => {
      expect(rendered.querySelector('source-pane-source-editor-card')).not.toBeNull()
    })
    expect(rendered.getAttribute('aria-busy')).toBe('false')
    expect(fileExplorer.registerEditor).toHaveBeenCalledOnce()
  })

  it('reuses an existing dialogs root when rendering', async () => {
    document.body.innerHTML = '<solid-ui-dialogs-root></solid-ui-dialogs-root>'
    const rendered = sourcePane.render(
      { uri: 'https://example.test/notes.txt' },
      { dom: document, session: { store: {} } }
    )

    expect(rendered.querySelector('solid-ui-dialogs-root')).toBeNull()
    document.body.append(rendered)
    await customElements.whenDefined('source-pane-source-editor-card')
    await vi.waitFor(() => {
      expect(rendered.querySelector('source-pane-source-editor-card')).not.toBeNull()
    })
    rendered.remove()
  })
})
