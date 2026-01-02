import { Controller, Get, Inject } from '@nestjs/common'

import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'
import { PrismaService } from './prisma.service'
import Redis from 'ioredis'

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Welcome API' })
  getHello() {
    return {
      message: 'Yuchi API',
      docs: `${process.env.API_URL}/docs`,
      health: `${process.env.API_URL}/healthz`,
      version: `${process.env.API_VERSION}`,
      uptime: process.uptime(),
    }
  }

  @Get('/healthz')
  @ApiOperation({
    summary:
      'A health check is positive if all the assigned health indicators are up and running.',
  })
  healthCheck() {
    return this.health.check([
      () => this.db.pingCheck('database', this.prisma),
      async () => {
        const result = await this.redis.ping()
        if (result === 'PONG') {
          return { redis: { status: 'up' } }
        }
        throw new Error('Redis ping failed')
      },
    ])
  }
}
