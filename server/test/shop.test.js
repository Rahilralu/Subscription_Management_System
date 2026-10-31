import { test } from 'node:test'
import assert from 'node:assert/strict'
import { productQuery } from '../src/modules/shop/shop.schema.js'

test('the product search is optional', () => {
  assert.deepEqual(productQuery.parse({}), {})
})

test('the search text is trimmed', () => {
  assert.equal(productQuery.parse({ search: '  hosting ' }).search, 'hosting')
})

test('a blank or very long search is refused', () => {
  assert.equal(productQuery.safeParse({ search: '   ' }).success, false)
  assert.equal(productQuery.safeParse({ search: 'x'.repeat(101) }).success, false)
})
