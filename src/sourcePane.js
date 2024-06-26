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

    function contentForNew (contentType) {
      let content = '\n'
      if (contentType.includes('json')) content = '{}\n'
      else if (contentType.includes('rdf+xml')) content = '<rdf:RDF\n xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n\n</rdf:RDF>'
      return content
    }

    return new Promise(function (resolve, reject) {
      kb.fetcher
        .webOperation('PUT', newInstance.uri, {
          data: contentForNew(contentType),
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

    function compactButton (dom) {
      return UI.widgets.button(
        dom,
        undefined,
        'Compact',
        compactHandler,
        { needsBorder: true }    
      )
    }

    const myCompactButton = controls.appendChild(compactButton(dom))
    const cancelButton = controls.appendChild(UI.widgets.cancelButton(dom))
    const saveButton = controls.appendChild(UI.widgets.continueButton(dom))
    const myEditButton = controls.appendChild(editButton(dom))

    function setUnedited () {
      if (broken) return
      editing = false
      myEditButton.style.visibility =  subject.uri.endsWith('/') ? 'collapse' : 'visible'
      textArea.style.color = '#888'
      cancelButton.style.visibility = 'visible'
      saveButton.style.visibility = 'collapse'
      myCompactButton['style'] = "visibility: visible; width: 100px; padding: 10.2px; transform: translate(0, -30%)"
      if (!compactable[contentType.split(';')]) {  myCompactButton.style.visibility = "collapse" }
      textArea.setAttribute('readonly', 'true')
    }
    function setEditable () {
      if (broken) return
      editing = true
      textArea.style.color = 'black'
      cancelButton.style.visibility = 'visible' // not logically needed but may be comforting
      saveButton.style.visibility = 'collapse'
      myEditButton.style.visibility = 'collapse'
      myCompactButton.style.visibility = 'collapse' // do not allow compact while editing
      textArea.removeAttribute('readonly')
    }
    function setEdited (_event) {
      if (broken || !editing) return
      textArea.style.color = 'green'
      cancelButton.style.visibility = 'visible'
      saveButton.style.visibility = 'visible'
      myEditButton.style.visibility = 'collapse'
      myCompactButton.style.visibility = 'collapse'
      textArea.removeAttribute('readonly')
    }
    const parseable = {
      'text/n3': true,
      'text/turtle': true,
      'application/rdf+xml': true,
      'application/xhtml+xml': true, // For RDFa?
      'text/html': true, // For data island
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
    function setCaretPosition (elem, cause) {
      if (elem != null) {
        if (cause.characterInFile === -1 && cause.lineNo) cause.lineNo += 1
        const pos = cause.lineNo ? elem.value.split('\n', cause.lineNo).join('\n').length : 0
        let caretPos = pos + cause.characterInFile
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

    function HTMLDataIsland (data) {
      let dataIslandContentType = ''
      let dataIsland = ''
      const scripts = data.split('</script')
      if (scripts && scripts.length) {
        for (let script of scripts) {
          script = '<script' + script.split('<script')[1] + '</script>'
          const RDFType = ['text/turtle', 'text/n3', 'application/ld+json', 'application/rdf+xml']
          const contentType = RDFType.find(type => script.includes(`type="${type}"`))
          if (contentType) {
            dataIsland = script.replace(/^<script(.*?)>/gm, '').replace(/<\/script>$/gm, '')
            dataIslandContentType = contentType
            break
          }
        }
      }
      return [dataIsland, dataIslandContentType]
    }

    function checkSyntax (data, contentType, base) {
      if (!parseable[contentType]) return true // don't check things we don't understand
      if (contentType === 'text/html') {
        [data, contentType, pos] = HTMLDataIsland(data)
        if (!contentType) return true
      }
      try {
        statusRow.innerHTML = ''
        if (contentType === 'application/json') return JSON.parse(data)
        else {
          try {
            kb.removeDocument(subject)
          } catch (err) {
            // this is a hack until issue is resolved in rdflib
            if (!err.message.includes('Statement to be removed is not on store')) throw err
            console.log(err)
          }
          delete fetcher.requested[subject.value]
          // rdflib parse jsonld do not return parsing errors
          if (contentType === 'application/ld+json') {
            JSON.parse(data)
            $rdf.parse(data, kb, base.uri, contentType, (err, res) => {
              if (err) throw err
              let serialized = $rdf.serialize(base, res, base.uri, contentType)
              if (data.includes('@id') && !serialized.includes('@id')) {
                const e = new Error('Invalid jsonld : predicate do not expand to an absolute IRI')
                statusRow.appendChild(UI.widgets.errorMessageBlock(dom, e))
                // throw e
                return false
              }
              return true
            })
          } else {
            $rdf.parse(data, kb, base.uri, contentType)
          }
        }
        return true
      } catch (e) {
        statusRow.appendChild(UI.widgets.errorMessageBlock(dom, e))
        for (let cause = e; (cause = cause.cause); cause) {
          if (cause.characterInFile) {
            setCaretPosition(textArea, cause)
          }
        }
        return false
      }
      return true
    }

    async function saveBack (_event) {
      const data = textArea.value
      if (!checkSyntax(data, contentType, subject)) {
        setEdited() // failed to save -> different from web
        textArea.style.color = 'red'
        return
      }
      const options = { data, contentType }
      if (eTag) options.headers = { 'if-match': eTag } // avoid overwriting changed files -> status 412
      try {
        const response = await fetcher.webOperation('PUT', subject.uri, options)
        if (!happy(response, 'PUT')) return
        /// @@ show edited: make save button disabled until edited again.
        try {
          const response = await fetcher.webOperation('HEAD', subject.uri) // , defaultFetchHeaders())
          if (!happy(response, 'HEAD')) return
          getResponseHeaders(response) // get new eTag
          setUnedited() // used to be setEdited()
        } catch (err) {
          throw err
        }
      } catch (err) {
        div.appendChild(
          UI.widgets.errorMessageBlock(dom, 'Error saving back: ' + err))
      }
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

    const compactable = {
      'text/n3': true,
      'text/turtle': true,
      'application/ld+json': true
    }
    function compactHandler (_event) {
        if (compactable[contentType]) {  
          try {
            $rdf.parse(textArea.value, kb, subject.uri, contentType)
            // for jsonld serialize which is a Promise. New rdflib
            const serialized = Promise.resolve($rdf.serialize(kb.sym(subject.uri), kb, subject.uri, contentType))
            serialized.then(result => { textArea.value = result; /*return div*/ })
            cancelButton.style.visibility = 'visible'
          } catch (e) {
            statusRow.appendChild(UI.widgets.errorMessageBlock(dom, e))
          }
      }
    }

    // function refresh (_event) {
      // Use default fetch headers (such as Accept)
      /* function defaultFetchHeaders () {
      const options = fetcher.initFetchOptions(subject.uri, {})
      const { headers } = options
      options.headers = new Headers()
      for (const header in headers) {
        if (typeof headers[header] === 'string') {
          options.headers.set(header, headers[header])
        }
      }
      return options
    } */

    // get response headers
    function getResponseHeaders (response) {
      if (response.headers && response.headers.get('content-type')) {
        contentType = response.headers.get('content-type').split(';')[0] // Should work but headers may be empty
        allowed = response.headers.get('allow')  //     const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
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
    }

    function refresh (_event) {
      // see https://github.com/linkeddata/rdflib.js/issues/629
      // const options = defaultFetchHeaders()

      fetcher
        .webOperation('GET', subject.uri) // , options)
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

          getResponseHeaders (response)
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
          setUnedited()
          // console.log('       source content-type ' + contentType)
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
    myCompactButton.addEventListener('click', compactHandler)
    myEditButton.addEventListener('click', setEditable)
    cancelButton.addEventListener('click', refresh)
    saveButton.addEventListener('click', saveBack)

    refresh()
    return div
  }
}

// ENDS
