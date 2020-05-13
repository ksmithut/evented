import { MessageStore } from './stores/common'
import { Aggregate } from './aggregate'
import { Subscription } from './subscription'
import { DuplicateCommandHandler, UnhandledCommand } from './errors'

export type EventedApplication = {
  dispatch: (
    messageId: string,
    command: { type: string; data: object }
  ) => Promise<bigint | null>
  start: () => Promise<() => void>
}

export function createApp ({
  messageStore,
  aggregates,
  subscriptions
}: {
  messageStore: MessageStore
  aggregates: readonly Aggregate<any>[]
  subscriptions: readonly Subscription[]
}) {
  const commandMapping = aggregates.reduce((typeMapping, aggregate) => {
    return aggregate._commandTypes.reduce((typeMapping, type) => {
      const existingAggregate = typeMapping.get(type)
      if (existingAggregate) {
        throw new DuplicateCommandHandler(type, aggregate, existingAggregate)
      }
      return typeMapping.set(type, aggregate)
    }, typeMapping)
  }, new Map<string, Aggregate<any>>())

  const app: EventedApplication = {
    // TODO metadata
    async dispatch (messageId, { type, data }) {
      const aggregate = commandMapping.get(type)
      if (!aggregate) throw new UnhandledCommand(type)
      const result = await aggregate._runCommand(messageId, messageStore, {
        type,
        data
      })
      return result
    },
    async start () {
      const subscriptionStoppers = await Promise.all(
        subscriptions.map(subscription => subscription._start(messageStore))
      )
      return async () => {
        await Promise.all(subscriptionStoppers.map(stop => stop()))
      }
    }
  }
  return app
}
exports.createApp = createApp
