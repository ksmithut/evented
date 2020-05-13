import * as z from 'zod'

export type MessageType<TSchema extends z.ZodObject<any>> = {
  (data: z.infer<TSchema>): { type: string; data: z.infer<TSchema> }
  readonly type: string
  readonly schema: TSchema
}

export type ExtractSchema<TSchema> = TSchema extends MessageType<infer X>
  ? z.infer<X>
  : never

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
