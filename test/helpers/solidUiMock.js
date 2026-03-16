const icons = {
  iconBase: ''
}

function makeButton (dom, label, handler) {
  const button = dom.createElement('button')
  const text = (label || '').toUpperCase()
  button.textContent = text
  if (label) button.setAttribute('title', label)
  if (typeof handler === 'function') {
    button.addEventListener('click', handler)
  }
  return button
}

const widgets = {
  button: (dom, _icon, label, handler, _options) => makeButton(dom, label, handler),
  cancelButton: (dom) => makeButton(dom, 'Cancel'),
  continueButton: (dom) => makeButton(dom, 'Continue'),
  errorMessageBlock: (dom, message) => {
    const div = dom.createElement('div')
    div.textContent = String(message)
    return div
  }
}

const ns = {
  httph: (name) => ({ value: `http://www.w3.org/2007/ont/httph#${name}` })
}

module.exports = {
  icons,
  widgets,
  ns
}
