jest.mock('../src/components/sourceEditorCard/SourceEditorCard', () => {
  if (!globalThis.customElements.get('solid-panes-source-editor-card')) {
    class MockSourceEditorCard extends globalThis.HTMLElement {
      getValue() {
        return ''
      }

      setValue() {}

      setReadOnly() {}

      focusEditor() {}
    }

    globalThis.customElements.define('solid-panes-source-editor-card', MockSourceEditorCard)
  }

  return globalThis.customElements.get('solid-panes-source-editor-card')
})

const { context } = require('./helpers/setup')
const paneModule = require('../src/sourcePane')
const pane = paneModule.default || paneModule
const { fireEvent } = require('@testing-library/dom')
const { setUnedited } = require('../src/helpers')

describe('source-pane', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('shows compact for compactable content and hides it for plain text', () => {
    const turtleSubject = { uri: 'https://janedoe.example/test.ttl' }
    const turtlePane = pane.render(turtleSubject, context)
    document.body.appendChild(turtlePane)

    setUnedited(turtleSubject, {
      broken: false,
      contentType: 'text/turtle',
      allowed: 'GET,PUT',
      eTag: '"123"',
    })

    expect(turtlePane.querySelector('.sourcePaneCompactButton').className).toContain('sourcePaneControlVisible')
    expect(turtlePane.querySelector('.sourcePaneEditButton').className).toContain('sourcePaneControlVisible')

    document.body.innerHTML = ''

    const textSubject = { uri: 'https://janedoe.example/test.txt' }
    const textPane = pane.render(textSubject, context)
    document.body.appendChild(textPane)

    setUnedited(textSubject, {
      broken: false,
      contentType: 'text/plain',
      allowed: 'GET,PUT',
      eTag: '"123"',
    })

    expect(textPane.querySelector('.sourcePaneCompactButton').className).toContain('sourcePaneControlHidden')
  })

  it('shows Save after edit and hides Compact until save', () => {
    const subject = { uri: 'https://janedoe.example/test.ttl' }
    const result = pane.render(subject, context)
    document.body.appendChild(result)

    setUnedited(subject, {
      broken: false,
      contentType: 'text/turtle',
      allowed: 'GET,PUT',
      eTag: '"123"',
    })

    fireEvent.click(result.querySelector('.sourcePaneEditButton'))

    expect(result.querySelector('.sourcePaneSaveButton').className).toContain('sourcePaneControlVisible')
    expect(result.querySelector('.sourcePaneCompactButton').className).toContain('sourcePaneControlHidden')
  })
})
