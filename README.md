# evented

A library to help making event-sourced applications easy and focused on your
application logic.

This is an experiment to help me get a firmer grasp on the concepts of event
modeling and event sourcing and should not be depended on.

This library is _heavily_ inspired by [commanded](https://github.com/commanded/commanded),
and elixir library for the same purpose. That one is production ready for sure.

# API

In order to use evented, you also need to install [`zod`](https://github.com/vriad/zod),
a data shape validation library. This is used to validate data in your events
and to give some intellisense to your event handlers.

```sh
npm install zod
# or yarn
yarn add zod
```

## Message Types

Before you do any coding, it's super important that you [model the events](https://eventmodeling.org/)
of your domain. So when you've done that, you can define those message types
(commands and events) here:

```js
const z = require('zod')
const { createMessageType } = require('evented')

// command
const AddTodo = createMessageType(
  'AddTodo',
  z.object({
    todoId: z.string(),
    label: z.string()
  })
)

// event
const TodoAdded = createMessageType(
  'TodoAdded',
  z.object({
    todoId: z.string(),
    label: z.string()
  })
)
```

Note that there is not technical difference between commands and events other
than their names. It's just important to note the difference in usage. Events
are truths and undisputable except through corrective events. Commands are
requests that may or may not result in the creation of events. Commands usually
need to go through some sort of validation (checking against business rules,
authorization, etc.) before they result in an event.

## Aggregates

An aggregate is your base unit of state to validate business logic. I won't go
into depth about what aggregates are/should be as it's covered in lots of
places.

To create an aggregate, you need a name, a schema, an initial value, and a key
to identify the stream by.

```js
// TODO Aggregate example
```

Aggregates have two different types of handlers, command handlers, and event
handlers. Command handlers are the things that take a command, check business
logic, and either return an error or return a new event to be added to the event
store. Event handlers take the resulting event and update the aggregate state.

```js
// TODO Aggregate command handler example
```

## Message Store

To initialize evented, you need to initialize an event store. The one that
this library comes with is [message-db](https://github.com/message-db/message-db)
from the [eventide project](http://docs.eventide-project.org).

```js
const { messageDb } = require('evented')

const {
  MESSAGE_DB_POSTGRES_URI = 'postgres://postgres:postgres@localhost:5432/message_store'
} = process.env

const messageStore = messageDb.createMessageStore(MESSAGE_DB_POSTGRES_URI)
```

In some sort of script, you'll need to install the message store
database/functions:

```js
messageStore.install().then(() => {
  console.log('done!')
})
```
