import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'

import { type AppConfig, loadConfig } from './config.js'
import { createDatabase, type DatabaseConnection } from './db/client.js'
import { HttpError } from './errors.js'
import { registerDemoRoutes } from './leads/demo-routes.js'
import { registerLeadRoutes } from './leads/routes.js'

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: Buffer
  }
}

export interface AppDependencies {
  config?: AppConfig
  database?: DatabaseConnection
}

export function buildApp(
  options: FastifyServerOptions = {},
  dependencies: AppDependencies = {},
): FastifyInstance {
  const app = Fastify(options)
  const config = dependencies.config ?? loadConfig()
  const database = dependencies.database ?? createDatabase(config.databaseUrl)
  const ownsDatabase = dependencies.database === undefined

  app.removeContentTypeParser('application/json')
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      const rawBody = Buffer.isBuffer(body) ? body : Buffer.from(body)
      request.rawBody = rawBody

      try {
        done(null, JSON.parse(rawBody.toString('utf8')) as unknown)
      } catch (error) {
        done(error as Error)
      }
    },
  )

  app.get('/', async () => ({
    name: 'Lead intake API',
  }))

  app.get('/health', async () => {
    await database.pool.query('select 1')
    return { status: 'ok' }
  })

  registerLeadRoutes(app, database.db, config)
  registerDemoRoutes(app, config)

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      })
    }

    const unknownError = error as { message?: unknown; statusCode?: unknown }
    const statusCode =
      typeof unknownError.statusCode === 'number' &&
      unknownError.statusCode >= 400 &&
      unknownError.statusCode < 500
        ? unknownError.statusCode
        : 500
    const code = statusCode === 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR'
    const message =
      statusCode === 500
        ? 'An unexpected error occurred'
        : String(unknownError.message ?? 'The request is invalid')

    if (statusCode === 500) request.log.error(error)

    return reply.status(statusCode).send({ error: { code, message } })
  })

  if (ownsDatabase) {
    app.addHook('onClose', async () => {
      await database.pool.end()
    })
  }

  return app
}
