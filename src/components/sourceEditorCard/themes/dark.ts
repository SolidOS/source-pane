import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight';

/* The base styles were copied from google 
   highlighting was modified to fit our design and needs */
const darkTheme = EditorView.theme({
  // Targets the outermost editor container
  '&': {
    color: '#e0e0e0',
    backgroundColor: '#1e1e1e',
    height: '100%'
  },
  
  // Targets the active editing area where text lives
  '.cm-content': {
    caretColor: '#ff0055', // Custom cursor color
    fontFamily: 'monospace'
  },
  
  // Targets the line that the cursor is currently on
  '.cm-activeLine': { 
    backgroundColor: '#2a2a2a' 
  },
  
  // Targets the line numbers sidebar panel
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    color: '#858585',
    border: 'none'
  },
  
  // Targets the active line number specifically
  '.cm-activeLineGutter': {
    color: '#fff',
    backgroundColor: '#2a2a2a'
  },
  
  // Targets text highlighted/selected by the user
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#3e4451 !important'
  }
}, { dark: true })

const darkHighlightStyle = HighlightStyle.define([
  { tag: t.keyword, color: '#FFFF8A', fontWeight: 'bold' },
  { tag: t.string, color: '#FF5CFF' },
  { tag: t.comment, color: '#6272a4', fontStyle: 'italic' },
  { tag: t.function(t.variableName), color: '#50fa7b' },
  { tag: t.variableName, color: '#f8f8f2' },
  { tag: t.number, color: '#bd93f9' },
  { tag: t.integer, color: '#bd93f9' },
  { tag: t.float, color: '#bd93f9' },
  { tag: t.url, color: '#FFFF00'},
  { tag: t.className, color: '#ff5555' },
  { tag: t.namespace, color: '#9b59b6' },
  { tag: t.meta, color: '#c678dd' },
  { tag: t.propertyName, color: '#00D100' },
  { tag: t.unit, color: '#9b59b6'},
  { tag: t.punctuation, color: '#ffffff' },
  { tag: t.literal, color: '#f1fa8c' },
  { tag: t.docString, color: '#6272a4', fontStyle: 'italic' },
  { tag: t.processingInstruction, color: '#ffffff' },
  { tag: t.angleBracket, color: '#f65353' },
  { tag: t.tagName, color: '#f65353' },
  { tag: t.attributeName, color: '#66d9ef' },
])

export const darkThemeExtension = [
  darkTheme,
  syntaxHighlighting(darkHighlightStyle)
]
