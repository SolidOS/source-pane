import { beforeAll, describe, expect, it } from 'vitest'
import { context, mockWebOperationOnceIf } from './helpers/setup.js'
import pane from '../src/sourcePane.js'
import { sym } from 'rdflib'

function fireClick (element) {
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }))
}

function findByText (root, text) {
  const candidates = Array.from(root.querySelectorAll('*'))
  return candidates.find((element) => element.textContent?.includes(text)) ?? null
}

function getByTitle (root, title) {
  return root.querySelector(`[title="${title}"]`)
}

function waitFor (callback) {
  return Promise.resolve().then(callback)
}

describe("source-pane", () => {
  describe("test button compact", () => {
    let result

    describe("text/turtle file", () => {
      beforeAll(() => {
        const subject = sym("https://janedoe.example/test.ttl")
        mockWebOperationOnceIf(subject.uri, {
          responseText: '<> a "test".',
          headers: {
            'Content-Type': 'text/turtle',
            Allow: 'GET, HEAD, PUT'
          }
        })
      result = pane.render(subject, context);
      });

      it.skip('button exist and is visible', async () => {
        const compact = result.querySelector('.sourcePaneCompactButton')
        expect(compact).not.toBeNull()
        expect(compact.classList.contains('sourcePaneControlVisible')).toBe(true)
      })

      it.skip('click "compact", button cancel is visible', async () => {
        const compact = result.querySelector('.sourcePaneCompactButton')
        fireClick(compact)
        const cancel = await getByTitle(result, 'Cancel')
        expect(cancel.classList.contains('sourcePaneControlVisible')).toBe(true)
      })

      it('click "edit", button compact is not visible', async () => {
        const edit = await getByTitle(result, 'Edit')
        fireClick(edit)
        const compact = result.querySelector('.sourcePaneCompactButton')
        expect(compact.classList.contains('sourcePaneControlHidden')).toBe(true)
      })

      it.skip('check content succeeds but should fail', async () => {
        waitFor(() => { expect(result).toContainHTML('<> a "1111".') })
      })
    })

    describe("text/plain file", () => {
      beforeAll(() => {
        const subject = sym("https://janedoe.example/test.txt")
        mockWebOperationOnceIf(subject.uri, {
          responseText: 'this is a test',
          headers: {
            'Content-Type': 'text/plain',
            Allow: 'GET, HEAD, PUT'
          }
        })
        result = pane.render(subject, context)
      });

      it('button exist and is not visible', async () => {
        const compact = result.querySelector('.sourcePaneCompactButton')
        expect(compact).not.toBeNull()
        expect(compact.classList.contains('sourcePaneControlHidden')).toBe(true)
      })
  
      it.skip('check content succeed but should fail', async () => {
        waitFor(() => { expect(result).toContainHTML('<> a "1111".') })
      })
    })

    describe.skip("container", () => {
      beforeAll(() => {
        const subject = sym("https://janedoe.example/public/")
        mockWebOperationOnceIf(subject.uri, {
          responseText: ' ',
          headers: {
            Allow: 'text/turtle'
          }
        })
        result = pane.render(subject, context)
      });

      it('compact and cancel are visible', async () => {
        const compact = await findByText(result, 'COMPACT')
        const cancel = await getByTitle(result, 'Cancel')
        expect(compact.classList.contains('sourcePaneControlVisible')).toBe(true)
        expect(cancel.classList.contains('sourcePaneControlVisible')).toBe(true)
      })
    })
  });
});
