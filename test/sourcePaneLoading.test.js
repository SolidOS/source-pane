import { beforeEach, describe, expect, it, vi } from 'vitest'
import sourcePane from '../src/sourcePane.ts'

vi.mock('../src/components/source-editor-card/SourceEditorCard', () => {
  throw new TypeError("Cannot read properties of undefined (reading 'call')")
})

function createPane () {
  const pane = sourcePane.render(
    { uri: 'https://example.test/notes.txt' },
    { dom: document, session: { store: {} } }
  )
  document.body.append(pane)
  return pane
}

describe('source editor loading failures', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('shows recovery instructions, details, and the original diagnostic', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pane = createPane()
    await vi.waitFor(() => {
      expect(pane.querySelector('solid-ui-error-state')).not.toBeNull()
    })
    const errorState = pane.querySelector('solid-ui-error-state')
    await vi.waitFor(() => {
      expect(errorState.getAttribute('title')).toBe('Could not start the source editor')
    })
    expect(errorState.getAttribute('message')).toContain('Your file has not been changed')
    expect(errorState.getAttribute('message')).toContain('unsaved work')
    expect(consoleError).toHaveBeenCalledWith('Failed to load source editor', {
      resourceUri: 'https://example.test/notes.txt',
      error: expect.any(Error)
    })
    const diagnostic = consoleError.mock.calls[0][1].error
    expect(errorState.querySelector('details').textContent).toContain(diagnostic.stack)
    expect(diagnostic.cause.message).toContain("reading 'call'")
    errorState.querySelector('button').click()
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledTimes(2))
    expect(pane.querySelectorAll('solid-ui-error-state')).toHaveLength(1)
    expect(pane.querySelector('source-pane-source-editor-card')).toBeNull()
  })

  it('does not report a later failure in another pane', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const first = createPane()
    first.remove()
    const second = createPane()
    await vi.waitFor(() => expect(second.querySelector('solid-ui-error-state')).not.toBeNull())
    expect(first.querySelector('solid-ui-error-state')).toBeNull()
    second.querySelector('solid-ui-error-state').dispatchEvent(new CustomEvent('close'))
    expect(second.querySelector('.sourcePaneStatus').dataset.visible).toBe('false')
    expect(second.querySelector('solid-ui-error-state')).toBeNull()
  })
})
