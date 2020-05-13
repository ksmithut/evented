import * as z from 'zod'
import {
  UnhandledAggregateCommand,
  UnableToIdentityAggregateStream
} from './errors'
import { MessageStore, StreamMessage } from './stores/common'
import { MessageType, ExtractSchema } from './message-type'

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

export function createAggregate<TAggregate extends z.ZodObject<any>> ({
  name,
  schema,
  initialValue,
  identifyBy
}: {
  name: string
  schema: TAggregate
  initialValue: z.infer<TAggregate>
  identifyBy: keyof z.infer<TAggregate>
}) {
  if (name.includes('-')) {
    throw new TypeError('aggregate names must not have `-` in them')
  }
  const initialValueCopy = schema.parse(initialValue)
  const commandHandlers = new Map<
    string,
    {
      handler: CommandHandler<TAggregate, MessageType<any>>
      schema: z.ZodObject<any>
    }
  >()
  const eventHandlers = new Map<
    string,
    {
      handler: EventHandler<TAggregate, MessageType<any>>
      schema: z.ZodObject<any>
    }
  >()

  function reduce (events: StreamMessage[], value?: z.infer<TAggregate>) {
    return events.reduce((aggregate, event) => {
      const eventHandler = eventHandlers.get(event.type)
      if (!eventHandler) return aggregate
      // TODO metadata
      return eventHandler.handler(aggregate, event.data)
    }, schema.parse(value ?? initialValueCopy))
  }

  const aggregate: Aggregate<TAggregate> = {
    get name () {
      return name
    },

    get commandTypes () {
      return Array.from(commandHandlers.keys())
    },

    command (commandType, handler) {
      commandHandlers.set(commandType.type, {
        handler,
        schema: commandType.schema
      })
      return aggregate
    },

    event (eventType, handler) {
      eventHandlers.set(eventType.type, {
        handler,
        schema: eventType.schema
      })
      return aggregate
    },

    async _runCommand (messageId, messageStore, { type, data }) {
      const commandHandler = commandHandlers.get(type)
      if (!commandHandler) throw new UnhandledAggregateCommand(type, aggregate)
      const id = data?.[identifyBy]
      if (!id) throw new UnableToIdentityAggregateStream(type, aggregate)
      const streamName = `${name}-${id}`
      // TODO get multiple batches, utilize snapshots
      const streamEvents = await messageStore.getStreamMessages({
        streamName
      })
      const aggregateValue = reduce(streamEvents)
      // TODO handle metadata
      const result = commandHandler.handler(aggregateValue, data)
      if (result instanceof Error) return Promise.reject(result)
      if (!result) return null
      return messageStore.writeMessage({
        id: messageId,
        streamName,
        data: result.data,
        type: result.type
        // TODO metadata
        // TODO setting for expectedVersion setting. Per command type
      })
    }
  }

  return aggregate
}
