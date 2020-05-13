export class WrongExpectedVersion extends Error {
  code: string
  details: { stream: string; streamVersion: bigint; expectedVersion: bigint }
  constructor (stream: string, streamVersion: bigint, expectedVersion: bigint) {
    super(
      `Wrong expected version: ${expectedVersion} (Stream: ${stream}, Stream Version: ${streamVersion})`
    )
    Error.captureStackTrace(this, this.constructor)
    this.code = 'WRONG_EXPECTED_VERSION'
    this.details = {
      stream,
      streamVersion,
      expectedVersion
    }
  }

  static assert (err: Error) {
    const match = err.message.match(
      /Wrong expected version: (?<expectedVersion>-?\d+) \(Stream: (?<stream>[^,]+), Stream Version: (?<streamVersion>-?\d+)\)/
    )
    if (!match) return
    const { stream, streamVersion, expectedVersion } = match.groups || {}
    throw new WrongExpectedVersion(
      stream,
      BigInt(streamVersion),
      BigInt(expectedVersion)
    )
  }
}
exports.WrongExpectedVersion = WrongExpectedVersion

export class InvalidUUID extends Error {
  code: string
  details: { id: any }
  constructor (id: any) {
    super(`Invalid syntax for UUID: ${id}`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'INVALID_UUID'
    this.details = {
      id
    }
  }

  static assert (err: Error) {
    const match = err.message.match(
      /invalid input syntax for type uuid: "(?<id>[^"]*)"/
    )
    if (!match) return
    const { id } = match.groups || {}
    throw new InvalidUUID(id)
  }
}

export class DuplicateMessageId extends Error {
  code: string
  details: { id: string }
  constructor (id: string) {
    super(`Duplicate message id: ${id}`)
    Error.captureStackTrace(this, this.constructor)
    this.code = 'DUPLICATE_MESSAGE_ID'
    this.details = {
      id
    }
  }

  static assert (err: Error, id: string) {
    const match = err.message.match(
      /duplicate key value violates unique constraint "messages_id"/
    )
    if (!match) return
    throw new DuplicateMessageId(id)
  }
}
