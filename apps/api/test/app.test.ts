import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildApp } from '../src/app.ts'

test('returns API information', async () => {
  const app = buildApp()

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      name: 'Lead intake API',
    })
  } finally {
    await app.close()
  }
})

test('returns 404 for an unknown route', async () => {
  const app = buildApp()

  try {
    await app.ready()

    const response = await app.inject({
      method: 'GET',
      url: '/missing',
    })

    assert.equal(response.statusCode, 404)
  } finally {
    await app.close()
  }
})
