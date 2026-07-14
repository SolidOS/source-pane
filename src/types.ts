export type HttpResourceMetadata = {
  contentType: string | undefined
  allowed: string | undefined
  eTag: string | undefined
  title: string | undefined
  modified: string | undefined
}

export type SourcePaneState = {
  broken: boolean
  dirty: boolean
  editing: boolean
} & HttpResourceMetadata
