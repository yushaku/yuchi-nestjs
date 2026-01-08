import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger'
import { SubscriptionService } from './subscription.service'
import { CreateSubscriptionCodeDto } from './dto/create-subscription-code.dto'
import { ApplySubscriptionCodeDto } from './dto/apply-subscription-code.dto'
import {
  SearchSubscriptionCodesDto,
  SubscriptionCodeResponseDto,
  SubscriptionCodesListResponseDto,
  SubscriptionResponseDto,
} from './dto/subscription-code.dto'
import { AdminOrSaleGuard } from '@/shared/guard/roles.guard'
import { JwtAuthGuard } from '@/shared/guard/auth.guard'
import { JwtUser, JwtDecoded } from '@/shared/decorators/JwtUser.decorator'
import { ThrottlerGuard } from '@nestjs/throttler'

@ApiTags('Subscription')
@ApiBearerAuth()
@Controller('subscription')
@UseGuards(ThrottlerGuard)
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Apply/redeem a subscription code',
    description:
      'Apply a subscription code to activate a subscription for the current user',
  })
  @ApiResponse({
    type: SubscriptionResponseDto,
    description: 'Subscription created successfully',
  })
  async applySubscriptionCode(
    @JwtUser() { userId }: JwtDecoded,
    @Body() dto: ApplySubscriptionCodeDto,
  ) {
    return this.subscriptionService.applySubscriptionCode(userId, dto)
  }

  @Post('code')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Create subscription code(s) (Admin or Sale only)',
    description:
      'Create a single code or multiple codes (count 2-100). Returns batch response for count>1.',
  })
  @ApiResponse({
    type: SubscriptionCodeResponseDto,
    description: 'Single code response when count=1',
  })
  async createSubscriptionCode(@Body() dto: CreateSubscriptionCodeDto) {
    return this.subscriptionService.createSubscriptionCode(dto)
  }

  @Get('codes')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Search and list subscription codes (Admin or Sale only)',
  })
  @ApiResponse({ type: SubscriptionCodesListResponseDto })
  async searchSubscriptionCodes(@Query() query: SearchSubscriptionCodesDto) {
    return this.subscriptionService.searchSubscriptionCodes(query)
  }

  @Get('code/:id')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Get subscription code by ID (Admin or Sale only)',
  })
  @ApiResponse({ type: SubscriptionCodeResponseDto })
  async getSubscriptionCode(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionCodeById(id)
  }

  @Put('code/:id')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Update subscription code (Admin or Sale only)',
  })
  @ApiResponse({ type: SubscriptionCodeResponseDto })
  async updateSubscriptionCode(
    @Param('id') id: string,
    @Body() dto: Partial<CreateSubscriptionCodeDto>,
  ) {
    // Convert string date to Date object if provided
    const updateData: any = { ...dto }
    if (dto.expiresAt !== undefined) {
      updateData.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null
    }
    // Auto-calculate duration based on planType if planType is being updated
    if (dto.planType !== undefined) {
      if (dto.planType === 'MONTHLY') {
        updateData.duration = 1
      } else if (dto.planType === 'YEARLY') {
        updateData.duration = 12
      } else if (dto.planType === 'LIFETIME') {
        updateData.duration = null
      }
    }
    return this.subscriptionService.updateSubscriptionCode(id, updateData)
  }

  @Delete('code/:id')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Delete subscription code (Admin or Sale only)',
  })
  async deleteSubscriptionCode(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionCode(id)
  }
}
