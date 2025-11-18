const { context, doc, subject } = require('./helpers/setup')
const pane = require('../src/sourcePane')
const { findByText, fireEvent, getByTitle, waitFor } = require('@testing-library/dom')
const fetchMock = require('jest-fetch-mock')
const { parse, sym } = require('rdflib')
const { solidLogicSingleton } = require('solid-logic')

describe("source-pane", () => {
  describe("test button compact", () => {
    describe("text/turtle file", () => {
      let result;
      beforeAll(() => {
        const subject = sym("https://janedoe.example/test.ttl")
        fetchMock.mockOnceIf(
          subject.uri,
          `<> a "test".`,
          {
            headers: {
              "Content-Type": "text/turtle",
            },
          }
        );
      result = pane.render(subject, context);
      });

      it.skip('button exist and is visible', async () => {
        const compact = await findByText(result, 'COMPACT')
        console.log(compact.style)
        expect(compact.style.visibility).toEqual('visible')
      })

      it.skip('click "compact", button cancel is visible', async () => {
        const compact = await findByText(result, 'COMPACT')
        fireEvent.click(compact)
        const cancel = await getByTitle(result, 'Cancel')
        expect(cancel.style.visibility).toEqual('visible')
      })

      it('click "edit", button compact is not visible', async () => {
        const edit = await getByTitle(result, 'Edit')
        fireEvent.click(edit)
        const compact = await findByText(result, 'COMPACT')
        expect(compact.style.visibility).not.toEqual('visible')
      })

      it.skip('check content succeeds but should fail', async () => {
        waitFor(() => { expect(result).toContainHTML('<> a "1111".') })
      })
    })

    describe("text/plain file", () => {
      beforeAll(() => {
        const subject = sym("https://janedoe.example/test.txt")
        fetchMock.mockOnceIf(
          subject.uri,
          `this is a test`,
          {
            headers: {
              "Content-Type": "text/plain",
            },
          }
        )
          result = pane.render(subject, context);
      });

      it('button exist and is not visible', async () => {
        const compact = await findByText(result, 'COMPACT')
        expect(compact).not.toBeNull()
        expect(compact.style.visibility).not.toEqual('visible')
      })
  
      it.skip('check content succeed but should fail', async () => {
        waitFor(() => { expect(result).toContainHTML('<> a "1111".') })
      })
    })

    describe.skip("container", () => {
      beforeAll(() => {
        const subject = sym("https://janedoe.example/public/")
        fetchMock.mockOnceIf(
          subject.uri,
          ` `,
          {
            headers: {
              "Allow": "text/turtle",
            },
          }
        )
          result = pane.render(subject, context);
      });

      it('compact and cancel are visible', async () => {
        const compact = await findByText(result, 'COMPACT')
        const cancel = await getByTitle(result, 'Cancel')
        expect(compact.style.visibility).toEqual('visible')
        expect(cancel.style.visibility).toEqual('visible')
      })
    })
  });
});
