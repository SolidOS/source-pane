// import "@testing-library/jest-dom";
const fetchMock = require('jest-fetch-mock')
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder

const $rdf = require('rdflib')
const SolidLogic = require('solid-logic')

global.$rdf = $rdf
global.SolidLogic = SolidLogic

fetchMock.enableMocks();
