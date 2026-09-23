export interface AppConfig {
  databaseUrl: string
  metaAppSecret?: string
  metaVerifyToken?: string
  port: number
}

function readPort(value: string | undefined): number {
  const port = Number.parseInt(value ?? '3001', 10)

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535')
  }

  return port
}

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return {
    databaseUrl:
      environment.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/lead_intake',
    metaAppSecret: environment.META_APP_SECRET,
    metaVerifyToken: environment.META_VERIFY_TOKEN,
    port: readPort(environment.PORT),
  }
}
