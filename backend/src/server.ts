import { buildApp } from './app.js'
import { env } from './lib/env.js'

async function main() {
  const app = await buildApp()
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`API:     http://localhost:${env.PORT}`)
    app.log.info(`Swagger: http://localhost:${env.PORT}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()