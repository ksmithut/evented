import { v4 as uuidv4 } from 'uuid'
import * as z from 'zod'
import { MessageStore, StreamMessage } from './stores/common'
import { MessageType, ExtractSchema } from './message-type'

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
  _start: (messageStore: MessageStore) => () => Promise<void>
}

function defaultOnError (
  err: any,
  { subscriptionId, stream }: { subscriptionId?: string; stream: string }
) {
  console.error(
    `error processing message: subscriptionId=${subscriptionId}, stream=${stream}`,
    err
  )
}

export function createSubscription ({
  stream,
  subscriptionId,
  batchSize = 100,
  positionUpdateInterval = 100,
  pollInterval = 100,
  onError = defaultOnError
}: {
  stream: string
  subscriptionId?: string
  batchSize?: number
  positionUpdateInterval?: number
  pollInterval?: number
  onError?: SubscriptionErrorHandler
}): Subscription {
  const messageHandlers = new Map<
    string,
    {
      handler: SubscriptionEventHandler<MessageType<any>>
      schema: z.ZodObject<any>
    }
  >()

  const subscriberStreamName = subscriptionId
    ? `subscriberPosition-${subscriptionId}`
    : undefined

  const subscription: Subscription = {
    handle (eventType, handler) {
      messageHandlers.set(eventType.type, {
        schema: eventType.schema,
        handler
      })
      return subscription
    },
    _start (messageStore) {
      let running = false
      let currentPosition = 0n
      let messagesSinceLastPositionWrite = 0
      const savePosition = async () => {
        if (subscriberStreamName) {
          await messageStore.writeMessage({
            id: uuidv4(),
            streamName: subscriberStreamName,
            data: { position: String(currentPosition) },
            type: '$EventedSubscriptionPositionUpdated'
          })
        }
      }

      async function startPolling () {
        const queryMessages = getQueryMessages(messageStore, stream)
        // Load current position
        currentPosition = await getStreamPosition(
          messageStore,
          subscriberStreamName
        )
        // eslint-disable-next-line no-unmodified-loop-condition
        while (running) {
          const messages = await queryMessages(
            currentPosition + 1n,
            BigInt(batchSize)
          )
          for (const message of messages) {
            // Handle message
            const typeHandler = messageHandlers.get(message.type)
            if (typeHandler) {
              const cleanedData = typeHandler.schema.parse(message.data)
              // TODO metadata
              await typeHandler.handler(cleanedData)
            }
            // Update current position
            currentPosition = message.globalPosition
            messagesSinceLastPositionWrite += 1
            // Check our update position poll
            if (messagesSinceLastPositionWrite >= positionUpdateInterval) {
              messagesSinceLastPositionWrite = 0
              await savePosition()
            }
          }
          if (messages.length === 0) {
            await new Promise(resolve => setTimeout(resolve, pollInterval))
          }
        }
        await savePosition
      }

      const polling = startPolling().catch(err => {
        onError(err, {
          subscriptionId,
          stream
        })
      })

      return async () => {
        running = false
        return polling
      }
    }
  }
  return subscription
}

type QueryMessages = (
  position: bigint,
  batchSize: bigint
) => Promise<StreamMessage[]>

function getQueryMessages (
  messageStore: MessageStore,
  stream: string
): QueryMessages {
  if (stream === '$all') {
    return (position, batchSize) => {
      return messageStore.getAllMessages({ position, batchSize })
    }
  }
  if (!stream.includes('-')) {
    return (position, batchSize) => {
      return messageStore.getCategoryMessages({
        categoryName: stream,
        position,
        batchSize
      })
    }
  }
  return (position, batchSize) => {
    return messageStore.getStreamMessages({
      streamName: stream,
      position,
      batchSize
    })
  }
}

async function getStreamPosition (
  messageStore: MessageStore,
  streamName?: string
) {
  if (!streamName) return 0n
  const lastMessage = await messageStore.getLastStreamMessage({ streamName })
  return lastMessage ? BigInt(lastMessage.data.position) : 0n
}
