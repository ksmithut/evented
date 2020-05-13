export type StreamMessage<
  TData = { [key: string]: any },
  TMetadata = { [key: string]: any }
> = {
  id: string
  streamName: string
  type: string
  position: bigint
  globalPosition: bigint
  data: TData
  metadata: TMetadata | null
  time: Date
}

export interface MessageStore {
  getCategoryMessages: (args: {
    categoryName: string
    position?: bigint | null
    batchSize?: bigint | null
  }) => Promise<StreamMessage[]>
  getStreamMessages: (args: {
    streamName: string
    position?: bigint | null
    batchSize?: bigint | null
  }) => Promise<StreamMessage[]>
  getAllMessages: (args: {
    position?: bigint | null
    batchSize?: bigint | null
  }) => Promise<StreamMessage[]>
  writeMessage: (args: {
    id: string
    streamName: string
    type: string
    data: object
    metadata?: object | null
    expectedVersion?: bigint | null
  }) => Promise<bigint>
  getLastStreamMessage: (args: {
    streamName: string
  }) => Promise<StreamMessage | null>
}
