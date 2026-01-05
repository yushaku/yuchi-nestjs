import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TerminusModule } from '@nestjs/terminus'
import { ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis'

import { AppController } from './app.controller'
import { AuthModule } from './auth/auth.module'
import { ShareModule } from './shared/share.module'
import { UserModule } from './user/user.module'
import { LearningModule } from './learning/learning.module'
import { SubscriptionModule } from './subscription/subscription.module'

import Redis from 'ioredis'
import Joi from 'joi'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.string().required(),

        JWT_SECRET: Joi.string().required(),
        COOKIE_SECRET: Joi.string().required(),

        GOOGLE_CLIENT_ID: Joi.string().required(),
        GOOGLE_CLIENT_SECRET: Joi.string().required(),

        THROTTLE_LIMIT: Joi.number().default(20),
        THROTTLE_TTL: Joi.number().default(60),
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL'),
            limit: config.get('THROTTLE_LIMIT'),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            port: config.get('REDIS_PORT'),
            host: config.get('REDIS_HOST'),
          }),
        ),
      }),
    }),
    TerminusModule,
    UserModule,
    AuthModule,
    ShareModule,
    LearningModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
