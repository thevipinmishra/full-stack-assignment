import { createHmac, timingSafeEqual } from 'node:crypto'

import { UnauthorizedError } from '../errors.js'

export function verifyWebhookSignature(
  rawBody: Buffer | undefined,
  received: string | string[] | undefined,
  secret: string | undefined,
): void {
  if (!secret) return

  if (typeof received !== 'string' || !rawBody) {
    throw new UnauthorizedError('A webhook signature is required')
  }

  const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`
  const actualBuffer = Buffer.from(received)
  const expectedBuffer = Buffer.from(expected)

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new UnauthorizedError('The webhook signature is invalid')
  }
}
