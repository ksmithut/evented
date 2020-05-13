import { Aggregate } from './aggregate'

export class DuplicateCommandHandler extends Error {
  code: string
  details: { type: string }
  constructor (
    type: string,
    aggregate1: Aggregate<any>,
    aggregate2: Aggregate<any>
  ) {
    super(
      `command type "${type}" is being handled by multiple aggregates (${aggregate1.name}, ${aggregate2.name})`
    )
    Error.captureStackTrace(this, this.constructor)
    this.code = 'DUPLICATE_COMMAND_HANDLER'
    this.details = {
      type
    }
  }
}

export class UnableToIdentityAggregateStream extends Error {
  code: string
  details: { type: string }
  constructor (type: string, aggregate: Aggregate<any>) {
    super(
      `commant type "${type}" not able to identity stream in aggregate "${aggregate.name}"`
    )
    Error.captureStackTrace(this, this.constructor)
    this.code = 'UNABLE_TO_IDENTIFY_AGGREGATE_STREAM'
    this.details = {
      type
    }
  }
}

export class UnhandledAggregateCommand extends Error {
  code: string
  details: { type: string }
  constructor (type: string, aggregate: Aggregate<any>) {
    super(
      `command type "${type}" cannot be handled by aggregate "${aggregate.name}"`
    )
    Error.captureStackTrace(this, this.constructor)
    this.code = 'UNHANDLED_AGGREGATE_COMMAND'
    this.details = {
      type
    }
  }
}

export class UnhandledCommand extends Error {
  code: string
  details: { type: string }
  constructor (type: string) {
    super(
      `command type "${type}" cannot be handled by any registered aggregates`
    )
    Error.captureStackTrace(this, this.constructor)
    this.code = 'UNHANDLED_COMMAND'
    this.details = {
      type
    }
  }
}
