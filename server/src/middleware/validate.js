import { z } from 'zod'
import { HttpError } from '../lib/http-error.js'

// usage: validate({ body: schema, query: schema, params: schema }), parsed values end up in req.valid
export const validate = (schemas) => (req, res, next) => {
  req.valid = {}
  for (const [part, schema] of Object.entries(schemas)) {
    const result = schema.safeParse(req[part] ?? {})
    if (!result.success) throw new HttpError(400, 'Invalid input', z.flattenError(result.error))
    req.valid[part] = result.data
  }
  next()
}
