export type ResourceMetadata = {
  contentType: string | undefined
  canEdit: boolean
  isPublic: boolean
  eTag: string | undefined
  modified: string | undefined
}

export type HeaderMetadata = Pick<ResourceMetadata, 'canEdit' | 'isPublic' | 'modified'>
export type EditorMetadata = Pick<ResourceMetadata, 'contentType' | 'eTag'>

export type SourcePaneState = {
  broken: boolean
  dirty: boolean
  editing: boolean
} 
