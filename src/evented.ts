import * as messageDb from './stores/message-db/message-db'

export { createMessageType, MessageType, ExtractSchema } from './message-type'
export {
  createAggregate,
  Aggregate,
  CommandHandler,
  EventHandler
} from './aggregate'
export { createApp, EventedApplication } from './app'
export {
  createSubscription,
  Subscription,
  SubscriptionErrorHandler,
  SubscriptionEventHandler
} from './subscription'

export const stores = {
  messageDb
}
