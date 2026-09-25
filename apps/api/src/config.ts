export interface AppConfig {
  databaseUrl: string
  metaVerifyToken?: string
  webhookSigningSecret?: string
  port: number
}

function readPort(value: string | undefined): number {
  const rawPort = value ?? '3001'
  const port = Number(rawPort)

  if (
    !/^\d+$/.test(rawPort) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65_535
  ) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const webhookSigningSecret = environment.WEBHOOK_SIGNING_SECRET?.trim()
  if (environment.NODE_ENV === 'production' && !webhookSigningSecret) {
    throw new Error('WEBHOOK_SIGNING_SECRET is required in production')
  }

  return {
    databaseUrl:
      environment.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/lead_intake',
    metaVerifyToken: environment.META_VERIFY_TOKEN?.trim() || undefined,
    webhookSigningSecret,
    port: readPort(environment.PORT),
  }
}
