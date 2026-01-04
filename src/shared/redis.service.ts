import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis
  private logger: Logger

  constructor(private configService: ConfigService) {
    this.logger = new Logger(RedisService.name)
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST'),
      port: this.configService.get('REDIS_PORT'),
    })
  }

  onModuleInit() {
    // Optional: Add connection event handlers
    this.client.on('connect', () => {
      this.logger.log('Redis client connected')
    })
  }

  onModuleDestroy() {
    this.client.disconnect()
  }

  getClient(): Redis {
    return this.client
  }
}
