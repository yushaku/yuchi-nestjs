import fastifyCookie from '@fastify/cookie'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap() {
  // fastify
  const adapter = new FastifyAdapter({ logger: false })
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  )

  const config = app.get(ConfigService)

  // Cookies
  // https://docs.nestjs.com/techniques/cookies
  await app.register(fastifyCookie as any, {
    secret: config.get('COOKIE_SECRET'),
  })

  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['set-cookie'],
  })

  // Auto-validation
  // https://docs.nestjs.com/techniques/validation#stripping-properties
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      stopAtFirstError: true,
    }),
  )

  // Swagger API Document
  const swaggerConfig = new DocumentBuilder()
    .setTitle('APIs document')
    .addBearerAuth()
    .setVersion('0.1.0')
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('/docs', app, document)

  app.enableShutdownHooks()

  const APP_PORT = process.env.APP_PORT ?? 8000
  console.log(`Listening for HTTP on http://localhost:${APP_PORT}`)
  await app.listen(APP_PORT, '0.0.0.0')

  const silentError = (err: any) => console.error(err)
  process.on('unhandledRejection', silentError)
  process.on('uncaughtException', silentError)
}

bootstrap()
