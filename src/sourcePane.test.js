const { context, doc, subject } = require('./setup')
const pane = require('../src/sourcePane')
const { findByText, fireEvent, getByTitle, waitFor } = require('@testing-library/dom')
const fetchMock = require('jest-fetch-mock')
const { parse } = require('rdflib')
const { solidLogicSingleton } = require('solid-logic')

describe("source-pane", () => {
  describe("test button compress", () => {
    let result;
    beforeAll(() => {
      result = pane.render(subject, context);
    });

    it('button exist and is visible', async () => {
      const button = await findByText(result, 'COMPRESS')
      expect(button).not.toBeNull()
      expect(button.style.visibility).toEqual('visible')
    })

    it('click "edit", button compress is not visible', async () => {
      const img = await getByTitle(result, 'Edit')
      fireEvent.click(img)
      const button = await findByText(result, 'COMPRESS')
      expect(button).not.toBeNull()
      expect(button.style.visibility).not.toEqual('visible')
    })

    describe("with a test turtle file", () => {
      beforeAll(() => {
        fetchMock.mockOnceIf(
          "https://janedoe.example/test.ttl",
          `<> a "test".`,
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          }
        );
          result = pane.render(subject, context);
      });

      it('check content should fail', async () => {
        waitFor(() => { expect(result).toContainHTML('<> a "test1".') })
      })
    })

  });
});
