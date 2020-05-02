import * as z from 'zod'

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
    correlation?: string | null
    consumerGroupMember?: bigint | null
    consumerGroupSize?: bigint | null
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

export type MessageType<TSchema extends z.ZodObject<any>> = {
  (data: z.infer<TSchema>): { type: string; data: z.infer<TSchema> }
  readonly type: string
  readonly schema: TSchema
}

export type ExtractSchema<TSchema> = TSchema extends MessageType<infer X>
  ? z.infer<X>
  : never

export type CommandHandler<
  TAggregate extends z.ZodObject<any>,
  TCommand extends MessageType<any>
> = (
  aggregate: z.infer<TAggregate>,
  command: ExtractSchema<TCommand>
) => { type: string; data: object } | Error | void | null

export type EventHandler<
  TAggregate extends z.ZodObject<any>,
  TEvent extends MessageType<any>
> = (
  aggregate: z.infer<TAggregate>,
  event: ExtractSchema<TEvent>
) => z.infer<TAggregate>

export type Aggregate<TAggregate extends z.ZodObject<any>> = {
  readonly name: string
  readonly commandTypes: string[]

  command: <TCommand extends MessageType<any>>(
    commandType: TCommand,
    handler: CommandHandler<TAggregate, TCommand>
  ) => Aggregate<TAggregate>

  event: <TEvent extends MessageType<any>>(
    eventType: TEvent,
    handler: EventHandler<TAggregate, TEvent>
  ) => Aggregate<TAggregate>

  _runCommand: (
    messageId: string,
    messageStore: MessageStore,
    incoming: { type: string; data: any }
  ) => Promise<bigint | null>
}

export type EventedApplication = {
  dispatch: (
    messageId: string,
    command: { type: string; data: object }
  ) => Promise<bigint | null>
  start: () => Promise<() => void>
  stop: () => Promise<void>
}

export type SubscriptionEventHandler<TEvent extends MessageType<any>> = (
  event: ExtractSchema<TEvent>
) => any

export type SubscriptionErrorHandler = (
  err: any,
  subscriptionInfo: { subscriptionId?: string; stream: string }
) => void

export type Subscription = {
  handle: <TEvent extends MessageType<any>>(
    eventType: TEvent,
    handler: SubscriptionEventHandler<TEvent>
  ) => Subscription
  _start: (messageStore: MessageStore) => void
  _stop: () => Promise<void>
}
