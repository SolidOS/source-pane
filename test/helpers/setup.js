// import { DataBrowserContext, PaneRegistry } from "pane-registry";
const { DataBrowserContext, PaneRegistry } = require('pane-registry')
// import { sym } from "rdflib";
const $rdf = require('rdflib')

const store = $rdf.graph()
const fetcher = new $rdf.Fetcher(store, { fetch: global.fetch })
store.fetcher = fetcher

exports.context = {
    dom: document,
    getOutliner: () => null,
    session: {
        paneRegistry: {
            byName: (name /*: string*/) => {
                return {
                    render: () => {
                        return document.createElement('div')
                            .appendChild(
                                document.createTextNode(`mock ${name} pane`)
                            );
                    }
                }
            }
        } /*as PaneRegistry*/,
        store,
        logic: {},
    },
} /*as unknown as DataBrowserContext;*/
