import { html } from 'lit'
import './StatusSection.css'

export function getStatusSection(){
  function showError(message: string) {
    const statusSection = document.querySelector('.sourcePaneStatus') as HTMLElement | null
    const statusMessageArea = document.getElementById('statusMessageArea')
    if (statusSection) {
      statusSection.dataset.visible = 'true'
    }
    if (statusMessageArea) {
      statusMessageArea.hidden = false
      const errorText = statusMessageArea.querySelector('.error-text')
      if (errorText) {
        errorText.textContent = message
      }
    }
  }

  function clearError() {
    const statusSection = document.querySelector('.sourcePaneStatus') as HTMLElement | null
    const statusMessageArea = document.getElementById('statusMessageArea')
    if (statusSection) {
      statusSection.dataset.visible = 'false'
    }
    if (statusMessageArea) {
      statusMessageArea.hidden = true
      const errorText = statusMessageArea.querySelector('.error-text')
      if (errorText) {
        errorText.textContent = ''
      }
    }
  }

  function renderStatusSection() {
    const statusMessage = ''

    return html`
      <section class="sourcePaneStatus" role="alert" data-visible="false">
        <div id="statusMessageArea" hidden>
          <p class="error-text">${statusMessage}</p>
          <button @click=${() => clearError()}>X</button>
        </div>
      </section>
    `
  }
  return {
    renderStatusSection,
    showError,
    clearError
  }
}
