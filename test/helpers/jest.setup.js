// import "@testing-library/jest-dom";
const fetchMock = require('jest-fetch-mock')
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder

const $rdf = require('rdflib')
const SolidLogic = require('solid-logic')

global.$rdf = $rdf
global.SolidLogic = SolidLogic

jest.mock('solid-ui', () => {
	const { LitElement } = require('lit')
	const { sym } = require('rdflib')

	class WebComponent extends LitElement {}

	const widgets = {
		button: (dom, icon, label) => {
			const button = dom.createElement('button')
			button.type = 'button'
			button.textContent = label
			if (icon) button.dataset.icon = icon
			return button
		},
	}

	const ns = {
		httph: (term) => sym(`http://www.w3.org/2007/ont/https#${term}`),
	}

	return {
		WebComponent,
		icons: { iconBase: 'https://example.test/icons/' },
		ns,
		widgets,
	}
})

jest.mock('solid-ui/components/button', () => ({}))

fetchMock.enableMocks();
