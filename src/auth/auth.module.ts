import { PrismaService } from '@/prisma.service'
import { QUEUE_LIST } from '@/shared/constant'
import { MailerModule } from '@nestjs-modules/mailer'
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter'
import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { PassportModule } from '@nestjs/passport'

import { join } from 'path'
import { AuthConsumer } from './auth.consumer'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  imports: [
    PassportModule,
    BullModule.registerQueue({ name: QUEUE_LIST.AUTH }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        transport: {
          secure: false,
          host: config.get('MAIL_HOST'),
          auth: {
            user: config.get('MAIL_USER'),
            pass: config.get('MAIL_PASSWORD'),
          },
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  providers: [AuthService, PrismaService, AuthConsumer],
  controllers: [AuthController],
})
export class AuthModule {}
