
import { Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { ThemeMode } from 'pane-registry'
import { darkThemeExtension } from './themes/dark'

export class SourceEditor {
  private _view: EditorView | null = null
  private _languageCompartment = new Compartment()
  private _editableCompartment = new Compartment()

  async initialize(container: HTMLElement, initialDoc = '', contentType: string = 'text/turtle', theme: ThemeMode = 'dark') {
    if (this._view) {
      this._view.destroy()
    }
    const [
      { EditorState },
      { drawSelection, keymap, lineNumbers }, 
      { defaultHighlightStyle, syntaxHighlighting },
      { defaultKeymap, history, historyKeymap }, 
      { oneDark }
    ] = await Promise.all([
      import(/* webpackChunkName: "codemirror-core" */ '@codemirror/state'),
      import(/* webpackChunkName: "codemirror-core" */ '@codemirror/view'),
      import(/* webpackChunkName: "codemirror-core" */ '@codemirror/language'),
      import(/* webpackChunkName: "codemirror-core" */ '@codemirror/commands'),
      import(/* webpackChunkName: "codemirror-core" */ '@codemirror/theme-one-dark')
    ])
    const languageExtension = await this._getLanguageExtension(contentType)
    /* we could add this if we want to update automatically
       perhaps or tell the user they have unsaved changes ,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const text = update.state.doc.toString()
           this._onChange(text)
           // We could also set a flag here and then check it in the save handler to avoid doing expensive operations on every change
          }
            }
        }) 
    and then set an onChange callback from the parent component to handle changes */

    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        theme === 'dark' ? darkThemeExtension : [],
        this._languageCompartment.of(languageExtension),
        this._editableCompartment.of(EditorView.editable.of(true)),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        lineNumbers(),
        history(),
        drawSelection(),
        EditorView.lineWrapping, 
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap
        ])
      ]
    })

    this._view = new EditorView({
      state,
      parent: container
    })
  }

  destroy() {
    this._view?.destroy()
    this._view = null
  }

  getValue(): string {
    return this._view ? this._view.state.doc.toString() : '';
  }

  // this is used in the compact handler to update the editor content after compacting without changing the editing state
  replaceContent(text: string) {
    if (!this._view) return
    const current = this._view.state.doc.toString()
    if (current === text) return
    this._view.dispatch({
      changes: { from: 0, to: this._view.state.doc.length, insert: text }
    })
  }

  setReadOnly(readOnly: boolean) {
    if (!this._view) return
    this._view.dispatch({
      effects: this._editableCompartment.reconfigure(EditorView.editable.of(!readOnly))
    })
  }

  focusEditor() {
    this._view?.focus()
  }

  async setLanguage(contentType: string) {
    if (!this._view) return

    const extension = await this._getLanguageExtension(contentType)
    this._view.dispatch({
      effects: this._languageCompartment.reconfigure(extension)
    })
  }

  private async _getLanguageExtension(contentType: string) {
    const getStreamLanguage = async () =>
      (await import(/* webpackChunkName: "codemirror-core" */ '@codemirror/language')).StreamLanguage
    
    switch (contentType) {
      case 'text/turtle':
      case 'text/n3':
        const turtleStreamLanguage = await getStreamLanguage()
        const { turtle } = await import(/* webpackChunkName: "lang-rdf" */ '@codemirror/legacy-modes/mode/turtle')
        return turtleStreamLanguage.define(turtle)

      case 'application/sparql-update':
      case 'application/sparql-query': 
        const sparqlStreamLanguage = await getStreamLanguage()
        const { sparql } = await import(/* webpackChunkName: "lang-rdf" */ '@codemirror/legacy-modes/mode/sparql')
        return sparqlStreamLanguage.define(sparql)

      case 'application/nquads':
      case 'application/n-quads':
      case 'application/n-triples':
        const nTriplesStreamLanguage = await getStreamLanguage()
        const { ntriples } = await import(/* webpackChunkName: "lang-rdf" */ '@codemirror/legacy-modes/mode/ntriples')
        return nTriplesStreamLanguage.define(ntriples)

      case 'application/json':
      case 'application/ld+json':
        const { json } = await import(/* webpackChunkName: "lang-json" */ '@codemirror/lang-json')
        return json()

      case 'text/html':
      case 'application/xhtml+xml':
        const { html } = await import(/* webpackChunkName: "lang-html" */ '@codemirror/lang-html')
        return html()

      case 'application/rdf+xml':
      case 'application/xml':
        const { xml } = await import(/* webpackChunkName: "lang-xml" */ '@codemirror/lang-xml')
        return xml()

      case 'text/css':
        const { css } = await import(/* webpackChunkName: "lang-css" */ '@codemirror/lang-css')
        return css()

      case 'text/javascript':
      case 'application/javascript':
      case 'application/ecmascript':
        const { javascript } = await import(/* webpackChunkName: "lang-javascript" */ '@codemirror/lang-javascript')
        return javascript()

      default:
        return []
    }
  }
}
