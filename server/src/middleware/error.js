import { HttpError } from '../lib/http-error.js'

export function notFound(req, res) {
  res.status(404).json({ error: { message: `Not found: ${req.method} ${req.originalUrl}` } })
}

export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, details: err.details } })
  }
  if (err.code === 'P2002') {
    return res.status(409).json({ error: { message: `${err.meta?.target ?? 'Record'} already exists` } })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: { message: 'Record not found' } })
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON' } })
  }

  console.error(err)
  res.status(500).json({ error: { message: 'Something went wrong' } })
}
