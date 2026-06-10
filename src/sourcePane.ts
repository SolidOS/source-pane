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
import './components/sourceEditorCard/SourceEditorCard'
import './components/source-provider/SourceProvider'
import './sourcePane.css'
import { SourcePaneState } from './types'

const pane = {
  icon: icons.iconBase + 'noun_109873.svg', // noun_109873_51A7F9.svg

  name: 'source',

  label: function (subject: NamedNode, context: DataBrowserContext) {
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

  // Create a new text file in a Solid system,
  mintNew: function (context: DataBrowserContext, newPaneOptions: NewPaneOptions) {
    const store = context.session.store
    let newInstance = newPaneOptions.newInstance
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
    const sourcePaneState: SourcePaneState = {
      broken: false,
      allowed: undefined,
      contentType: undefined,
      eTag: undefined
    }

    const sourcePane = context.dom.createElement('div')
    sourcePane.setAttribute('class', 'sourcePane')
    litRender(html`
        <solid-panes-source-provider
          .context=${context}
          .subject=${subject}
          .sourcePaneState=${sourcePaneState}
        >
        </solid-panes-source-provider>
    `, sourcePane)

    return sourcePane
  }
}

export default pane
