import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildApp } from '../src/app.ts'

test('returns the API starting-point message', async () => {
  const app = buildApp()

  try {
    const response = await app.inject({
      method: 'GET',
      url: '/',
    })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json(), {
      message:
        'API is running. This is a starting point; webhook and related APIs are still to be built.',
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
