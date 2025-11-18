// import "@testing-library/jest-dom";
const fetchMock = require('jest-fetch-mock')
const { TextEncoder, TextDecoder } = require('util')

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder

fetchMock.enableMocks();
