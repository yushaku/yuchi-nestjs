import fastifyCookie from '@fastify/cookie'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'

import { AppModule } from './app.module'
import { HttpLoggingInterceptor } from './shared/interceptor'

async function bootstrap() {
  // fastify
  const adapter = new FastifyAdapter({
    logger: false,
    trustProxy: true,
  })
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
  )

  // Use Winston logger
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER)
  app.useLogger(logger)

  const config = app.get(ConfigService)

  // Cookies
  // https://docs.nestjs.com/techniques/cookies
  await app.register(fastifyCookie as any, {
    secret: config.get('COOKIE_SECRET'),
  })

  // Passport compatibility with Fastify
  // Add Express-compatible methods to Fastify response for Passport JWT
  const instance = app.getHttpAdapter().getInstance()
  instance.addHook('onRequest', (request: any, reply: any, done: any) => {
    // Add Express-compatible setHeader method for Passport JWT
    if (!reply.setHeader) {
      reply.setHeader = function (name: string, value: string) {
        reply.header(name, value)
        return this
      }
    }
    // Add Express-compatible end method for Passport JWT
    if (!reply.end) {
      reply.end = function (chunk?: any, encoding?: any) {
        if (chunk) {
          reply.send(chunk)
        } else {
          reply.send()
        }
        return this
      }
    }
    done()
  })

  app.enableCors({
    origin: true,
    credentials: true,
    exposedHeaders: ['set-cookie'],
  })

  // Auto-validation with Zod
  app.useGlobalPipes(new ZodValidationPipe())

  // HTTP Request Logging Interceptor
  app.useGlobalInterceptors(new HttpLoggingInterceptor())

  // Swagger API Document
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Yuchi API')
    .setDescription('API documentation for Yuchi - Korean learning application')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build()

  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('/docs', app, document)

  app.enableShutdownHooks()

  const APP_PORT = process.env.APP_PORT ?? 8000
  logger.log(`Listening for HTTP on http://localhost:${APP_PORT}`, 'Bootstrap')
  await app.listen(APP_PORT, '0.0.0.0')

  // Use Winston logger for error handling
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection', reason, 'Bootstrap')
  })
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error.stack, 'Bootstrap')
    process.exit(1)
  })
}

bootstrap()
