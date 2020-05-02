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
