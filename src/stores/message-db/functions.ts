import { Pool } from 'pg'
import { StreamMessage } from '../../evented-types'
import { WrongExpectedVersion } from './errors'

type RawStreamMessage = {
  id: string
  stream_name: string // eslint-disable-line camelcase
  type: string
  position: string
  global_position: string // eslint-disable-line camelcase
  data: string
  metadata: string | null
  time: Date
}

function mapMessage (message: RawStreamMessage): StreamMessage {
  return {
    id: message.id,
    streamName: message.stream_name,
    type: message.type,
    position: BigInt(message.position),
    globalPosition: BigInt(message.global_position),
    data: JSON.parse(message.data),
    metadata: message.metadata === null ? null : JSON.parse(message.metadata),
    time: message.time
  }
}

const ACQUIRE_LOCK = 'SELECT acquire_lock($1)'

export async function acquireLock (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(ACQUIRE_LOCK, [streamName])
  const acquireLock = result.rows[0].acquire_lock
  return acquireLock
}

const CARDINAL_ID = 'SELECT * FROM cardinal_id($1)'

export async function cardinalId (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(CARDINAL_ID, [streamName])
  const cardinalId = result.rows[0].cardinal_id
  if (!cardinalId) return null
  return cardinalId
}

const CATEGORY = 'SELECT * FROM category($1)'

export async function category (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(CATEGORY, [streamName])
  const category = result.rows[0].category
  if (!category) return null
  return category
}

const GET_CATEGORY_MESSAGES =
  'SELECT * FROM get_category_messages($1, $2, $3, $4, $5, $6, $7)'

export async function getCategoryMessages (
  db: Pool,
  {
    categoryName,
    position,
    batchSize,
    correlation,
    consumerGroupMember,
    consumerGroupSize,
    condition
  }: {
    categoryName: string
    position?: bigint | null
    batchSize?: bigint | null
    correlation?: string | null
    consumerGroupMember?: bigint | null
    consumerGroupSize?: bigint | null
    condition?: string | null
  }
) {
  const result = await db.query(GET_CATEGORY_MESSAGES, [
    categoryName,
    position,
    batchSize,
    correlation,
    consumerGroupMember,
    consumerGroupSize,
    condition
  ])
  return result.rows.map(mapMessage)
}

const GET_LAST_STREAM_MESSAGE = 'SELECT * FROM get_last_stream_message($1)'

export async function getLastStreamMessage (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(GET_LAST_STREAM_MESSAGE, [streamName])
  if (!result.rows[0]) return null
  return mapMessage(result.rows[0])
}

const GET_STREAM_MESSAGES = 'SELECT * FROM get_stream_messages($1, $2, $3, $4)'

export async function getStreamMessages (
  db: Pool,
  {
    streamName,
    position,
    batchSize,
    condition
  }: {
    streamName: string
    position?: bigint | null
    batchSize?: bigint | null
    condition?: string | null
  }
) {
  const result = await db.query(GET_STREAM_MESSAGES, [
    streamName,
    position,
    batchSize,
    condition
  ])
  return result.rows.map(mapMessage)
}

const GET_ALL_MESSAGES = `
  SELECT
    id::varchar,
    stream_name::varchar,
    type::varchar,
    position::bigint,
    global_position::bigint,
    data::varchar,
    metadata::varchar,
    time::timestamp
  FROM
    messages
  WHERE
    global_position > $1
  LIMIT $2
`

export async function getAllMessages (
  db: Pool,
  {
    position,
    batchSize
  }: {
    position?: bigint | null
    batchSize?: bigint | null
  }
) {
  const result = await db.query(GET_ALL_MESSAGES, [position, batchSize])
  return result.rows.map(mapMessage)
}

const HASH_64 = 'SELECT hash_64($1)'

export async function hash64 (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(HASH_64, [streamName])
  return result.rows[0].hash_64
}

const ID = 'SELECT * FROM id($1)'

export async function id (db: Pool, { streamName }: { streamName: string }) {
  const result = await db.query(ID, [streamName])
  const id = result.rows[0].id
  if (!id) return null
  return id
}

const IS_CATEGORY = 'SELECT * FROM is_category($1)'

export async function isCategory (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(IS_CATEGORY, [streamName])
  return result.rows[0].is_category === 't'
}

const MESSAGE_STORE_VERSION = 'SELECT message_store_version()'

export async function messageStoreVersion (db: Pool) {
  const result = await db.query(MESSAGE_STORE_VERSION, [])
  return result.rows[0].message_store_version
}

const STREAM_VERSION = 'SELECT * FROM stream_version($1)'

export async function streamVersion (
  db: Pool,
  { streamName }: { streamName: string }
) {
  const result = await db.query(STREAM_VERSION, [streamName])
  const streamVersion = result.rows[0].stream_version
  return BigInt(streamVersion)
}

const WRITE_MESSAGE = 'SELECT write_message($1, $2, $3, $4, $5, $6)'

export async function writeMessage (
  db: Pool,
  {
    id,
    streamName,
    type,
    data,
    metadata,
    expectedVersion
  }: {
    id: string
    streamName: string
    type: string
    data: object
    metadata?: object | null
    expectedVersion?: bigint | null
  }
) {
  const result = await db
    .query(WRITE_MESSAGE, [
      id,
      streamName,
      type,
      data,
      metadata,
      expectedVersion
    ])
    .catch(err => {
      WrongExpectedVersion.assert(err)
      throw err
    })
  const streamVersion = result.rows[0].write_message
  return BigInt(streamVersion)
}
