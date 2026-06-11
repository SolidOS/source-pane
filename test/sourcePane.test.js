jest.mock('../src/components/sourceEditorCard/SourceEditorCard', () => {
  if (!globalThis.customElements.get('solid-panes-source-editor-card')) {
    class MockSourceEditorCard extends globalThis.HTMLElement {
      connectedCallback() {
        this.innerHTML = `
          <section class="sourcePaneCard">
            <button class="sourcePaneSaveButton sourcePaneControlHidden">Save Changes</button>
            <button class="sourcePaneCompactButton sourcePaneControlHidden">Compact</button>
          </section>
        `
      }

      getValue() {
        return ''
      }

      setValue() {}

      setReadOnly() {}

      focusEditor() {}

      updateEditingState(editing) {
        const saveButton = this.querySelector('.sourcePaneSaveButton')
        const compactButton = this.querySelector('.sourcePaneCompactButton')
        if (saveButton) {
          saveButton.classList.toggle('sourcePaneControlVisible', Boolean(editing))
          saveButton.classList.toggle('sourcePaneControlHidden', !editing)
        }
        if (compactButton) {
          compactButton.classList.toggle('sourcePaneControlVisible', !editing)
          compactButton.classList.toggle('sourcePaneControlHidden', Boolean(editing))
        }
      }
    }

    globalThis.customElements.define('solid-panes-source-editor-card', MockSourceEditorCard)
  }

  return globalThis.customElements.get('solid-panes-source-editor-card')
})

const { context } = require('./helpers/setup')
const paneModule = require('../src/sourcePane')
const pane = paneModule.default || paneModule
const { fireEvent } = require('@testing-library/dom')

describe('source-pane', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    jest.restoreAllMocks()
  })

  it('renders the pane shell and edit control', () => {
    const subject = { uri: 'https://janedoe.example/test.ttl' }
    const result = pane.render(subject, context)
    document.body.appendChild(result)

    const provider = result.querySelector('solid-panes-source-provider')

    return provider.updateComplete.then(() => {
      expect(result.querySelector('solid-panes-source-provider')).not.toBeNull()
      expect(result.querySelector('.sourcePaneEditButton')).not.toBeNull()
      expect(result.querySelector('.sourcePaneSaveButton').className).toContain('sourcePaneControlHidden')
      expect(result.querySelector('.sourcePaneCompactButton').className).toContain('sourcePaneControlHidden')
    })
  })

  it('switches the editor card into editing mode when edit is clicked', () => {
    const subject = { uri: 'https://janedoe.example/test.ttl' }
    const result = pane.render(subject, context)
    document.body.appendChild(result)

    const provider = result.querySelector('solid-panes-source-provider')
    return provider.updateComplete.then(() => {
      const editorCard = result.querySelector('solid-panes-source-editor-card')
      editorCard.updateEditingState = jest.fn((editing) => {
        const saveButton = editorCard.querySelector('.sourcePaneSaveButton')
        const compactButton = editorCard.querySelector('.sourcePaneCompactButton')
        if (saveButton) {
          saveButton.classList.toggle('sourcePaneControlVisible', Boolean(editing))
          saveButton.classList.toggle('sourcePaneControlHidden', !editing)
        }
        if (compactButton) {
          compactButton.classList.toggle('sourcePaneControlVisible', !editing)
          compactButton.classList.toggle('sourcePaneControlHidden', Boolean(editing))
        }
      })
      editorCard.setReadOnly = jest.fn()
      editorCard.focusEditor = jest.fn()

      fireEvent.click(result.querySelector('.sourcePaneEditButton'))

      expect(editorCard.updateEditingState).toHaveBeenCalledWith(true)
      expect(editorCard.setReadOnly).toHaveBeenCalledWith(false)
      expect(editorCard.focusEditor).toHaveBeenCalled()
      expect(result.querySelector('.sourcePaneSaveButton').className).toContain('sourcePaneControlVisible')
      expect(result.querySelector('.sourcePaneCompactButton').className).toContain('sourcePaneControlHidden')
    })
  })
})
