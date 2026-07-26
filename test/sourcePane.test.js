import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let sourcePane

beforeAll(async () => {
  await import('../src/components/source-provider/SourceProvider.ts')
  await import('../src/components/header/SourceHeader.ts')
  sourcePane = (await import('../src/sourcePane.ts')).default

})

function renderPaneIntoDocument () {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const store = { findTypeURIs: vi.fn(() => ({})) }
  const subject = { uri: 'https://janedoe.example/test.ttl' }
  const context = {
    dom: document,
    session: { store }
  }
  const rendered = sourcePane.render(subject, context)
  container.appendChild(rendered)
  return { container, subject, store, rendered }
}

describe('source-pane', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders the source provider wrapper', async () => {
    const { rendered } = renderPaneIntoDocument()
    await Promise.resolve()

    expect(rendered).not.toBeNull()
    expect(rendered.className).toBe('sourcePane')
    expect(rendered.getAttribute('class')).toBe('sourcePane')
  })
})
