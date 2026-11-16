import { describe, expect, it } from 'vitest'
import { render } from 'lit'
import { getStatusSection } from '../src/StatusSection'

describe('Source Pane status section', () => {
  it('preserves startup recovery instructions when a background error arrives', () => {
    const root = document.createElement('div')
    const status = getStatusSection(root)
    render(status.renderStatusSection(), root)

    status.showError('Try loading the editor again', {
      title: 'Could not start the source editor',
      onRetry: () => {}
    })
    status.showError('Background content request failed')

    expect(root.querySelector('solid-ui-error-state').getAttribute('title'))
      .toBe('Could not start the source editor')
    expect(root.querySelector('button').textContent).toBe('Try again')
  })

  it('replaces an old error and clears it when dismissed', () => {
    const root = document.createElement('div')
    const status = getStatusSection(root)
    render(status.renderStatusSection(), root)

    status.showError('First failure')
    status.showError('Latest failure')

    const errors = root.querySelectorAll('solid-ui-error-state')
    expect(errors).toHaveLength(1)
    expect(errors[0].getAttribute('message')).toBe('Latest failure')
    errors[0].dispatchEvent(new CustomEvent('close'))
    expect(root.querySelector('solid-ui-error-state')).toBeNull()
    expect(root.querySelector('.sourcePaneStatus').dataset.visible).toBe('false')
  })

  it('renders non-error messages as a status and clears previous errors', () => {
    const root = document.createElement('div')
    document.body.append(root)
    const status = getStatusSection(root)
    render(status.renderStatusSection(), root)

    status.showError('Unable to save')
    expect(root.querySelector('solid-ui-error-state')).not.toBeNull()

    status.showStatus('Source saved.')

    expect(root.querySelector('solid-ui-error-state')).toBeNull()
    expect(root.querySelector('.sourcePaneStatusMessage')?.textContent).toBe('Source saved.')
    expect(root.querySelector('.sourcePaneStatus')?.dataset.visible).toBe('true')
  })

  it('keeps status messages scoped to the supplied Source Pane root', () => {
    const first = document.createElement('div')
    const second = document.createElement('div')
    document.body.append(first, second)
    const firstStatus = getStatusSection(first)
    const secondStatus = getStatusSection(second)
    render(firstStatus.renderStatusSection(), first)
    render(secondStatus.renderStatusSection(), second)

    firstStatus.showStatus('First source saved.')

    expect(first.querySelector('.sourcePaneStatusMessage')?.textContent).toBe('First source saved.')
    expect(second.querySelector('.sourcePaneStatusMessage')).toBeNull()
  })
})
