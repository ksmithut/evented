import * as z from 'zod'
import { MessageType } from './evented-types'

export function createMessageType<T extends z.ZodObject<any>> (
  type: string,
  schema: T
): MessageType<T> {
  return Object.assign(
    (data: z.infer<T>) => ({
      type,
      data: schema.parse(data)
    }),
    {
      get type () {
        return type
      },
      get schema () {
        return schema
      }
    }
  )
}
