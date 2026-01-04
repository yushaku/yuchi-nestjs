import { Controller, Get } from '@nestjs/common'

import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus'
import { PrismaService } from './shared/prisma.service'
import { RedisService } from './shared/redis.service'

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private health: HealthCheckService,
    private db: PrismaHealthIndicator,
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Welcome API' })
  getHello() {
    return {
      message: 'Yuchi API',
      docs: `/docs`,
      health: `/healthz`,
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
        const result = await this.redisService.getClient().ping()
        if (result === 'PONG') {
          return { redis: { status: 'up' } }
        }
        throw new Error('Redis ping failed')
      },
    ])
  }
}
