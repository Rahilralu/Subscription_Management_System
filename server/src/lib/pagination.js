import { z } from 'zod'

export const paginationSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}

export function pageArgs({ page, pageSize }) {
  return { skip: (page - 1) * pageSize, take: pageSize }
}

export function pageMeta({ page, pageSize }, total) {
  return { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }
}
