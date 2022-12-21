// import { DataBrowserContext, PaneRegistry } from "pane-registry";
const { DataBrowserContext, PaneRegistry } = require('pane-registry')
// import { sym } from "rdflib";
const { sym } = require('rdflib')
// import { SolidLogic, store } from "solid-logic";
const { SolidLogic, store } = require('solid-logic')

const subject = sym("https://janedoe.example/test.ttl");
exports.subject = subject
exports.doc = subject.doc();

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
        logic: {} /*as SolidLogic*/,
    },
} /*as unknown as DataBrowserContext;*/
