/*      Source editor Pane
 **
 **  This pane allows the original source of a resource to be edited by hand
 **
*/
import { NamedNode, Util } from 'rdflib'
import { icons } from 'solid-ui'
import { DataBrowserContext, NewPaneOptions } from 'pane-registry'
import * as mime from 'mime-types'
import { html, render as litRender } from 'lit'
import { log } from './debug'
import { getStatusSection } from './StatusSection'
import './sourcePane.css'
import 'solid-ui/components/dialogs-root'
import './components/source-provider/SourceProvider'

const pane = {
  icon: icons.iconBase + 'noun_109873.svg', // noun_109873_51A7F9.svg

  name: 'source',

  label: function (subject: NamedNode, context: DataBrowserContext) {
    // Servers can omit MIME types or incorrectly advertise files as LDP containers.
    if (/\.[cm]?js$/i.test(new URL(subject.uri).pathname)) return 'Javascript Source'
    const store = context.session.store
    const typeURIs = store.findTypeURIs(subject)
    const prefix = Util.mediaTypeClass('text/*').uri.split('*')[0]
    for (const t in typeURIs) {
      if (t.startsWith(prefix)) return 'Source'
      if (t.includes('xml')) return 'XML Source'
      if (t.includes('json')) return 'JSON Source' // Like eg application/ld+json
      if (t.includes('javascript')) return 'Javascript Source'
    }
    return null
  },

  shouldGetFocus: function (subject: NamedNode) {
    return /\.[cm]?js$/i.test(new URL(subject.uri).pathname)
  },

  // Create a new text file in a Solid system,
  mintNew: function (context: DataBrowserContext, newPaneOptions: NewPaneOptions) {
    const store = context.session.store
    let newInstance = newPaneOptions.newInstance
    // The folder pane supplies a candidate URI for every pane and appends a
    // slash while constructing it. A source resource must not retain that
    // container marker: it changes the MIME lookup and makes the server treat
    // the PUT as an LDP container creation.
    if (newInstance?.uri.endsWith('/')) {
      const uri = newInstance.uri.slice(0, -1)
      newInstance = store.sym(uri)
      newPaneOptions.newInstance = newInstance
      newPaneOptions.newBase = uri
    }
    if (!newInstance) {
      let uri = newPaneOptions.newBase
      if (uri.endsWith('/')) {
        uri = uri.slice(0, -1)
        newPaneOptions.newBase = uri
      }
      newInstance = store.sym(uri)
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

    function contentForNew (contentType: string) {
      let content = '\n'
      if (contentType.includes('json')) content = '{}\n'
      else if (contentType.includes('rdf+xml')) content = '<rdf:RDF\n xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n\n</rdf:RDF>'
      return content
    }

    return new Promise(function (resolve, reject) {
      store.fetcher
        .webOperation('PUT', newInstance.uri, {
          data: contentForNew(contentType),
          contentType: contentType
        })
        .then(
          function () {
            log('New text file created: ' + newInstance.uri)
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

  render: function (subject: NamedNode, context: DataBrowserContext) {
    const { renderStatusSection } = getStatusSection()
    const sourcePane = context.dom.createElement('div')
    sourcePane.setAttribute('class', 'sourcePane')
    const hasDialogsRoot = Boolean(context.dom.querySelector('solid-ui-dialogs-root'))

    litRender(html`
        <source-pane-source-provider
          .context=${context}
          .subject=${subject}
        ></source-pane-source-provider>
        ${renderStatusSection()}
        ${hasDialogsRoot ? '' : html`<solid-ui-dialogs-root></solid-ui-dialogs-root>`}
      `, sourcePane)

    void import('./components/source-editor-card/SourceEditorCard')
      .then(() => {
        const sourceProvider = sourcePane.querySelector('source-pane-source-provider')
        sourceProvider?.append(context.dom.createElement('source-pane-source-editor-card'))
      })
      .catch(error => {
        const message = `Failed to load source editor: ${error instanceof Error ? error.message : String(error)}`
        log(message)
        getStatusSection().showError(message)
      })

    return sourcePane
  }
}

export default pane
