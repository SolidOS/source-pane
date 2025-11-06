// import "@testing-library/jest-dom";
const fetchMock = require('jest-fetch-mock')
const { TextEncoder, TextDecoder } = require('util')

// Mock external dependencies that solid-logic expects
jest.mock('$rdf', () => require('rdflib'), { virtual: true })

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder

fetchMock.enableMocks();
