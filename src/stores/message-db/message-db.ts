'use strict'

import { Pool } from 'pg'
import {
  acquireLock,
  cardinalId,
  category,
  getCategoryMessages,
  getLastStreamMessage,
  getStreamMessages,
  getAllMessages,
  hash64,
  id,
  isCategory,
  messageStoreVersion,
  streamVersion,
  writeMessage
} from './functions'
import { install, update1_0_0 } from './install' // eslint-disable-line camelcase

export function createMessageStore (postgresURI: string) {
  const db = new Pool({ connectionString: postgresURI })

  db.on('connect', client => {
    client
      .query('SET search_path = message_store, public')
      .catch(err => console.log('error setting search_path', err))
  })

  return {
    install: install.bind(null, postgresURI),
    update1_0_0: update1_0_0.bind(null, postgresURI),
    close: () => db.end(),

    writeMessage: writeMessage.bind(null, db),
    getStreamMessages: getStreamMessages.bind(null, db),
    getCategoryMessages: getCategoryMessages.bind(null, db),
    getLastStreamMessage: getLastStreamMessage.bind(null, db),
    getAllMessages: getAllMessages.bind(null, db),
    streamVersion: streamVersion.bind(null, db),
    id: id.bind(null, db),
    cardinalId: cardinalId.bind(null, db),
    category: category.bind(null, db),
    isCategory: isCategory.bind(null, db),
    acquireLock: acquireLock.bind(null, db),
    hash64: hash64.bind(null, db),
    messageStoreVersion: messageStoreVersion.bind(null, db)
  }
}
