/* eslint-env jest */
import { v4 as uuid } from 'uuid'
import { Client } from 'pg'
import { createMessageStore as messageDb } from '../message-db/message-db'
import {
  InvalidUUID,
  WrongExpectedVersion,
  DuplicateMessageId
} from '../errors'
import { MessageStore } from '../common'

const POSTGRES_DATABASE = 'message-db-test'
const ROOT_POSTGRES_URI = 'postgres://postgres:postgres@localhost:5432/postgres'
const POSTGRES_URI = `postgres://postgres:postgres@localhost:5432/${POSTGRES_DATABASE}`

type MessageStoreTest<TMessageStore extends MessageStore> = {
  before: () => Promise<TMessageStore>
  after: (state: TMessageStore) => Promise<void>
}

const messageStoreTable: [string, MessageStoreTest<MessageStore>][] = [
  [
    'message-db',
    {
      before: async () => {
        const messageStore = messageDb(POSTGRES_URI)
        await messageStore.install({ silent: true })
        return messageStore
      },
      after: async messageStore => {
        await messageStore.close()
        const db = new Client({ connectionString: ROOT_POSTGRES_URI })
        await db.connect()
        await db.query(`DROP DATABASE "${POSTGRES_DATABASE}"`)
        await db.end()
      }
    } as MessageStoreTest<any>
  ]
]

describe.each(messageStoreTable)('stores/%s', (_name, setup) => {
  let messageStore: MessageStore
  beforeAll(async () => {
    messageStore = await setup.before()
  })
  afterAll(async () => {
    await setup.after(messageStore)
  })

  test('should write a message', async () => {
    const streamVersion = await messageStore.writeMessage({
      id: uuid(),
      streamName: 'test-1',
      type: 'TestWrite',
      data: {}
    })
    // @ts-ignore
    expect(streamVersion).toBe(0n)
  })

  test('should fail if the id is invalid', async () => {
    await expect(
      messageStore.writeMessage({
        id: '123',
        streamName: 'test-2',
        type: 'TestWrite',
        data: {}
      })
    ).rejects.toThrow(InvalidUUID)
  })

  test('should fail if the version did not match the expected version', async () => {
    await expect(
      messageStore.writeMessage({
        id: uuid(),
        streamName: 'test-3',
        type: 'TestWrite',
        data: {},
        // @ts-ignore
        expectedVersion: 1n
      })
    ).rejects.toThrow(WrongExpectedVersion)
  })

  test('should fail if the message id already existed', async () => {
    const messageId = uuid()
    await messageStore.writeMessage({
      id: messageId,
      streamName: 'test-4',
      type: 'TestWrite',
      data: {}
    })
    await expect(
      messageStore.writeMessage({
        id: messageId,
        streamName: 'test-4',
        type: 'TestWrite',
        data: {}
      })
    ).rejects.toThrow(DuplicateMessageId)
  })

  describe('.getStreamMessages()', () => {
    test('should be able to get the stream messages', async () => {
      const ids = [uuid(), uuid(), uuid()]
      await messageStore.writeMessage({
        id: ids[0],
        streamName: 'test-5',
        type: 'TestWrite',
        data: { first: true }
      })
      await messageStore.writeMessage({
        id: ids[1],
        streamName: 'test-6',
        type: 'TestWrite',
        data: { first: true }
      })
      await messageStore.writeMessage({
        id: ids[2],
        streamName: 'test-5',
        type: 'TestWrite',
        data: { first: false }
      })
      await expect(
        messageStore.getStreamMessages({
          streamName: 'test-5'
        })
      ).resolves.toMatchObject([
        {
          id: ids[0],
          streamName: 'test-5',
          type: 'TestWrite',
          // @ts-ignore
          position: 0n,
          globalPosition: expect.anything(),
          data: { first: true },
          metadata: null,
          time: expect.any(Date)
        },
        {
          id: ids[2],
          streamName: 'test-5',
          type: 'TestWrite',
          // @ts-ignore
          position: 1n,
          globalPosition: expect.anything(),
          data: { first: false },
          metadata: null,
          time: expect.any(Date)
        }
      ])
      await expect(
        messageStore.getStreamMessages({
          streamName: 'test-6'
        })
      ).resolves.toMatchObject([
        {
          id: ids[1],
          streamName: 'test-6',
          type: 'TestWrite',
          // @ts-ignore
          position: 0n,
          globalPosition: expect.anything(),
          data: { first: true },
          metadata: null,
          time: expect.any(Date)
        }
      ])
    })

    test('should return batches of stream messages', async () => {
      const range = new Array(1500).fill(null).map(async () => {
        await messageStore.writeMessage({
          id: uuid(),
          streamName: 'test-7',
          type: 'TestWrite',
          data: {}
        })
      })
      await Promise.all(range)
      await expect(
        messageStore.getStreamMessages({
          streamName: 'test-7'
        })
      ).resolves.toHaveLength(1000)
      await expect(
        messageStore.getStreamMessages({
          streamName: 'test-7',
          // @ts-ignore
          batchSize: 500n
        })
      ).resolves.toHaveLength(500)
    })
  })

  describe('.getCategoryMessages()', () => {
    it('should be able to get the category messages', async () => {
      const ids = [uuid(), uuid(), uuid()]
      await messageStore.writeMessage({
        id: ids[0],
        streamName: 'test1-1',
        type: 'TestWrite',
        data: {}
      })
      await messageStore.writeMessage({
        id: ids[1],
        streamName: 'test2-1',
        type: 'TestWrite',
        data: {}
      })
      await messageStore.writeMessage({
        id: ids[2],
        streamName: 'test1-2',
        type: 'TestWrite',
        data: {}
      })
      await expect(
        messageStore.getCategoryMessages({
          categoryName: 'test1'
        })
      ).resolves.toMatchObject([
        {
          id: ids[0],
          streamName: 'test1-1',
          type: 'TestWrite',
          // @ts-ignore
          position: 0n,
          globalPosition: expect.anything(),
          data: {},
          metadata: null,
          time: expect.any(Date)
        },
        {
          id: ids[2],
          streamName: 'test1-2',
          type: 'TestWrite',
          // @ts-ignore
          position: 0n,
          globalPosition: expect.anything(),
          data: {},
          metadata: null,
          time: expect.any(Date)
        }
      ])
      await expect(
        messageStore.getCategoryMessages({
          categoryName: 'test2'
        })
      ).resolves.toMatchObject([
        {
          id: ids[1],
          streamName: 'test2-1',
          type: 'TestWrite',
          // @ts-ignore
          position: 0n,
          globalPosition: expect.anything(),
          data: {},
          metadata: null,
          time: expect.any(Date)
        }
      ])
    })

    it('should return batches of category messages', async () => {
      const range = new Array(1500).fill(null).map(async (_, i) => {
        await messageStore.writeMessage({
          id: uuid(),
          streamName: `test3-${i % 5}`,
          type: 'TestWrite',
          data: {}
        })
      })
      await Promise.all(range)
      await expect(
        messageStore.getCategoryMessages({
          categoryName: 'test3'
        })
      ).resolves.toHaveLength(1000)
      await expect(
        messageStore.getCategoryMessages({
          categoryName: 'test3',
          // @ts-ignore
          batchSize: 500n
        })
      ).resolves.toHaveLength(500)
    })
  })
})
