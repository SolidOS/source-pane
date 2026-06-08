import type { ThemeMode } from 'pane-registry'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, drawSelection, keymap, lineNumbers } from '@codemirror/view'
import { defaultHighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { css } from '@codemirror/lang-css'
import { html } from '@codemirror/lang-html'
import { javascript } from '@codemirror/lang-javascript'
import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
// import { oneDark } from '@codemirror/theme-one-dark'
import { turtle } from '@codemirror/legacy-modes/mode/turtle'
import { sparql } from '@codemirror/legacy-modes/mode/sparql'
import { ntriples } from '@codemirror/legacy-modes/mode/ntriples'
import { darkThemeExtension } from './themes/dark'

export class SourceEditor {
  private _view: any = null
  private _languageCompartment: any = null
  private _editableCompartment: any = null

  async initialize(container: HTMLElement, initialDoc = '', contentType: string = 'text/turtle', theme: ThemeMode = 'dark') {
    if (this._view) {
      this._view.destroy()
    }

    this._languageCompartment = new Compartment()
    this._editableCompartment = new Compartment()
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

    switch (contentType) {
      case 'text/turtle':
      case 'text/n3':
        return StreamLanguage.define(turtle)

      case 'application/sparql-update':
      case 'application/sparql-query': 
        return StreamLanguage.define(sparql)

      case 'application/nquads':
      case 'application/n-quads':
      case 'application/n-triples':
        return StreamLanguage.define(ntriples)

      case 'application/json':
      case 'application/ld+json':
        return json()

      case 'text/html':
      case 'application/xhtml+xml':
        return html()

      case 'application/rdf+xml':
      case 'application/xml':
        return xml()

      case 'text/css':
        return css()

      case 'text/javascript':
      case 'application/javascript':
      case 'application/ecmascript':
        return javascript()

      default:
        return []
    }
  }
}
