import Fastify, {
  type FastifyInstance,
  type FastifyServerOptions,
} from 'fastify'

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options)

  app.get('/', async () => ({
    message:
      'API is running. This is a starting point; webhook and related APIs are still to be built.',
  }))

  return app
}
