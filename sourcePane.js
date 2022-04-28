/*      Source editor Pane
 **
 **  This pane allows the original source of a resource to be edited by hand
 **
 */

const $rdf = require('rdflib')
const UI = require('solid-ui')
const mime = require('mime-types')

module.exports = {
  icon: UI.icons.iconBase + 'noun_109873.svg', // noun_109873_51A7F9.svg

  name: 'source',

  label: function (subject, context) {
    const kb = context.session.store
    const typeURIs = kb.findTypeURIs(subject)
    const prefix = $rdf.Util.mediaTypeClass('text/*').uri.split('*')[0]
    for (const t in typeURIs) {
      if (t.startsWith(prefix)) return 'Source'
      if (t.includes('xml')) return 'XML Source'
      if (t.includes('json')) return 'JSON Source' // Like eg application/ld+json
      if (t.includes('javascript')) return 'Javascript Source'
    }
    return null
  },

  // Create a new text file in a Solid system,
  mintNew: function (context, newPaneOptions) {
    const kb = context.session.store
    let newInstance = newPaneOptions.newInstance
    if (!newInstance) {
      let uri = newPaneOptions.newBase
      if (uri.endsWith('/')) {
        uri = uri.slice(0, -1)
        newPaneOptions.newBase = uri
      }
      newInstance = kb.sym(uri)
      newPaneOptions.newInstance = newInstance
    }

    const contentType = mime.lookup(newInstance.uri)
    if (
      !contentType ||
      !(contentType.startsWith('text') || contentType.includes('xml') || contentType.includes('json') || contentType.includes('javascript'))
    ) {
      const msg =
        'A new text file has to have an file extension like .txt .ttl .json etc.'
      alert(msg)
      throw new Error(msg)
    }

    return new Promise(function (resolve, reject) {
      kb.fetcher
        .webOperation('PUT', newInstance.uri, {
          data: contentType.includes('json') ? '{}\n' : '\n',
          contentType: contentType
        })
        .then(
          function (_response) {
            console.log('New text file created: ' + newInstance.uri)
            newPaneOptions.newInstance = newInstance
            resolve(newPaneOptions)
          },
          err => {
            alert('Cant make new file: ' + err)
            reject(err)
          }
        )
    })
  },

  render: function (subject, context) {
    const dom = context.dom
    const kb = context.session.store
    const fetcher = kb.fetcher
    const editStyle =
      'font-family: monospace; font-size: 100%; min-width:60em; margin: 1em 0.2em 1em 0.2em; padding: 1em; border: 0.1em solid #888; border-radius: 0.5em;'
    let readonly = true
    let editing = false
    let broken = false
    // Set in refresh()
    let contentType, allowed, eTag // Note it when we read and use it when we save

    const div = dom.createElement('div')
    div.setAttribute('class', 'sourcePane')
    const table = div.appendChild(dom.createElement('table'))
    const main = table.appendChild(dom.createElement('tr'))
    const statusRow = table.appendChild(dom.createElement('tr'))
    const controls = table.appendChild(dom.createElement('tr'))
    controls.setAttribute('style', 'text-align: right;')

    const textArea = main.appendChild(dom.createElement('textarea'))
    textArea.setAttribute('style', editStyle)

    function editButton (dom) {
      return UI.widgets.button(
        dom,
        UI.icons.iconBase + 'noun_253504.svg',
        'Edit'
      )
    }

    const cancelButton = controls.appendChild(UI.widgets.cancelButton(dom))
    const saveButton = controls.appendChild(UI.widgets.continueButton(dom))
    const myEditButton = controls.appendChild(editButton(dom))

    function setUnedited () {
      if (broken) return
      editing = false
      myEditButton.style.visibility = 'visible'
      textArea.style.color = '#888'
      cancelButton.style.visibility = 'collapse'
      saveButton.style.visibility = 'collapse'
      textArea.setAttribute('readonly', 'true')
    }
    function setEditable () {
      if (broken) return
      editing = true
      textArea.style.color = 'black'
      cancelButton.style.visibility = 'visible' // not logically needed but may be comforting
      saveButton.style.visibility = 'collapse'
      myEditButton.style.visibility = 'collapse'
      textArea.removeAttribute('readonly')
    }
    function setEdited (_event) {
      if (broken || !editing) return
      textArea.style.color = 'green'
      cancelButton.style.visibility = 'visible'
      saveButton.style.visibility = 'visible'
      myEditButton.style.visibility = 'collapse'
      textArea.removeAttribute('readonly')
    }
    const parseable = {
      'text/n3': true,
      'text/turtle': true,
      'application/rdf+xml': true,
      'application/xhtml+xml': true, // For RDFa?
      //        'text/html': true,
      //        'application/sparql-update': true,
      'application/json': true,
      'application/ld+json': true
      //        'application/nquads' : true,
      //        'application/n-quads' : true
    }

    /** Set Caret position in a text box
     * @param {Element} elem - the element to be tweaked
     * @param {Integer} caretPos - the poisition starting at zero
     * @credit  https://stackoverflow.com/questions/512528/set-keyboard-caret-position-in-html-textbox
     */
    function setCaretPosition (elem, caretPos) {
      if (elem != null) {
        if (elem.createTextRange) {
          const range = elem.createTextRange()
          range.move('character', caretPos)
          range.select()
        } else {
          elem.focus()
          if (elem.selectionStart) {
            elem.setSelectionRange(caretPos, caretPos)
          }
        }
      }
    }

    function checkSyntax (data, contentType, base) {
      if (!parseable[contentType]) return true // don't check things we don't understand
      try {
        statusRow.innerHTML = ''
        contentType === 'application/json' ? JSON.parse(data) : $rdf.parse(data, kb, base, contentType)
      } catch (e) {
        statusRow.appendChild(UI.widgets.errorMessageBlock(dom, e))
        for (let cause = e; (cause = cause.cause); cause) {
          if (cause.characterInFile) {
            setCaretPosition(textArea, e.characterInFile)
          }
        }
        return false
      }
      return true
    }

    function saveBack (_event) {
      const data = textArea.value
      if (!checkSyntax(data, contentType, subject.uri)) {
        setEdited() // failed to save -> different from web
        textArea.style.color = 'red'
        return
      }
      const options = { data, contentType }
      if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412
      fetcher
        .webOperation('PUT', subject.uri, options)
        .then(function (response) {
          if (!happy(response, 'PUT')) return
          /// @@ show edited: make save button disabled util edited again.
          setEditable()
        })
        .catch(function (err) {
          div.appendChild(
            UI.widgets.errorMessageBlock(dom, 'Error saving back: ' + err)
          )
        })
    }

    function happy (response, method) {
      if (!response.ok) {
        let msg = 'HTTP error on ' + method + '! Status: ' + response.status
        console.log(msg)
        if (response.status === 412) msg = 'Error: File changed by someone else'
        statusRow.appendChild(UI.widgets.errorMessageBlock(dom, msg))
      }
      return response.ok
    }

    function refresh (_event) {
      // Use default fetch headers (such as Accept)
      const options = fetcher.initFetchOptions(subject.uri, {})
      const { headers } = options
      options.headers = new Headers()
      for (const header in headers) {
        if (typeof headers[header] === 'string') {
          options.headers.set(header, headers[header])
        }
      }

      fetcher
        .webOperation('GET', subject.uri, options)
        .then(function (response) {
          if (!happy(response, 'GET')) return
          const desc = response.responseText
          if (desc === undefined) { // Defensive https://github.com/linkeddata/rdflib.js/issues/506
            const msg = 'source pane: No text in response object!!'
            statusRow.appendChild(UI.widgets.errorMessageBlock(dom, msg))
            return // Never mis-represent the contents of the file.
          }
          textArea.rows = desc.split('\n').length + 2
          textArea.cols = 80
          textArea.value = desc

          setUnedited()
          if (response.headers && response.headers.get('content-type')) {
            contentType = response.headers.get('content-type') // Should work but headers may be empty
            allowed = response.headers.get('allow')
            eTag = response.headers.get('etag')
          } else {
            const reqs = kb.each(
              null,
              kb.sym('http://www.w3.org/2007/ont/link#requestedURI'),
              subject.uri
            )
            reqs.forEach(req => {
              const rrr = kb.any(
                req,
                kb.sym('http://www.w3.org/2007/ont/link#response')
              )
              if (rrr && rrr.termType === 'NamedNode') {
                contentType = kb.anyValue(rrr, UI.ns.httph('content-type'))
                allowed = kb.anyValue(rrr, UI.ns.httph('allow'))
                eTag = kb.anyValue(rrr, UI.ns.httph('etag'))
                if (!eTag) console.log('sourcePane: No eTag on GET')
              }
            })
          }

          if (!contentType) {
            readonly = true
            broken = true
            statusRow.appendChild(
              UI.widgets.errorMessageBlock(
                dom,
                'Error: No content-type available!'
              )
            )
            return
          }
          console.log('       source content-type ' + contentType)
          // let allowed = response.headers['allow']
          if (!allowed) {
            console.log('@@@@@@@@@@ No Allow: header from this server')
            readonly = false // better allow just in case
          } else {
            readonly = allowed.indexOf('PUT') < 0 // In future more info re ACL allow?
          }
          textArea.readonly = readonly
        })
        .catch(err => {
          div.appendChild(
            UI.widgets.errorMessageBlock(dom, 'Error reading file: ' + err)
          )
        })
    }

    textArea.addEventListener('keyup', setEdited)
    myEditButton.addEventListener('click', setEditable)
    cancelButton.addEventListener('click', refresh)
    saveButton.addEventListener('click', saveBack)

    refresh()
    return div
  }
}

// ENDS
