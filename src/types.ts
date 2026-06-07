export type HttpResourceMetadata = {
  contentType: string | undefined
  allowed: string | undefined
  eTag: string | undefined
}

export type SourcePaneState = {
  broken: boolean
} & HttpResourceMetadata
