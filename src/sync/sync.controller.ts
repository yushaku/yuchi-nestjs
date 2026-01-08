import { Controller, Post, Body, UseGuards, Get, Query } from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'
import { JwtAuthGuard } from '@/shared/guard/auth.guard'
import { JwtUser, JwtDecoded } from '@/shared/decorators'
import { ResponseDTO } from '@/shared/dto/response.dto'
import { ApiOkResponseDTO } from '@/shared/decorators'
import { SyncService } from './sync.service'
import {
  PushWordProgressDto,
  PushWordProgressResponseDto,
  PullWordProgressDto,
  PullWordProgressResponseDto,
} from './dto/sync.dto'

@Controller('sync')
@ApiTags('sync')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@ApiBearerAuth()
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('push')
  @ApiOperation({
    summary: 'PUSH: Send pending sync data from mobile app',
    description:
      'Mobile app sends word progress data from pending_sync_ids table. Returns success=true to allow app to clear pending_sync_ids table.',
  })
  @ApiOkResponseDTO({ data: PushWordProgressResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Push completed successfully',
    type: PushWordProgressResponseDto,
  })
  async pushWordProgress(
    @JwtUser() { userId }: JwtDecoded,
    @Body() dto: PushWordProgressDto,
  ): Promise<ResponseDTO<PushWordProgressResponseDto>> {
    const result = await this.syncService.pushWordProgress(userId, dto)
    return new ResponseDTO({ data: result })
  }

  @Get('pull')
  @ApiOperation({
    summary: 'PULL: Get updated word progress data with pagination',
    description:
      'Returns word progress records updated after lastSyncTime. Supports pagination (50 records per page). Use lastSyncTime=null for first-time login to get all 5000 words.',
  })
  @ApiOkResponseDTO({ data: PullWordProgressResponseDto })
  @ApiResponse({
    status: 200,
    description: 'Pull completed successfully',
    type: PullWordProgressResponseDto,
  })
  async pullWordProgress(
    @JwtUser() { userId }: JwtDecoded,
    @Query() dto: PullWordProgressDto,
  ): Promise<ResponseDTO<PullWordProgressResponseDto>> {
    const result = await this.syncService.pullWordProgress(userId, dto)
    return new ResponseDTO({ data: result })
  }
}
