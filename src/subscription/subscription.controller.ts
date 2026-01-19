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
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger'
import { SubscriptionService } from './subscription.service'
import { CreateSubscriptionCodeDto } from './dto/create-subscription-code.dto'
import { ApplySubscriptionCodeDto } from './dto/apply-subscription-code.dto'
import { CreateGooglePlaySubscriptionDto } from './dto/create-google-play-subscription.dto'
import { CreateAppleSubscriptionDto } from './dto/create-apple-subscription.dto'
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

  @Post('google-play')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create subscription from Google Play purchase',
  })
  @ApiBody({ type: CreateGooglePlaySubscriptionDto })
  @ApiResponse({
    status: 201,
    type: SubscriptionResponseDto,
    description: 'Subscription created successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async createGooglePlaySubscription(
    @JwtUser() { userId }: JwtDecoded,
    @Body() dto: CreateGooglePlaySubscriptionDto,
  ) {
    return this.subscriptionService.createGooglePlaySubscription(userId, {
      planType: dto.planType,
      purchaseToken: dto.purchaseToken,
      subscriptionId: dto.subscriptionId,
      orderId: dto.orderId ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate:
        dto.endDate === undefined
          ? undefined
          : dto.endDate === null
            ? null
            : new Date(dto.endDate),
    })
  }

  @Post('apple')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create subscription from Apple App Store purchase',
  })
  @ApiBody({ type: CreateAppleSubscriptionDto })
  @ApiResponse({
    status: 201,
    type: SubscriptionResponseDto,
    description: 'Subscription created successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async createAppleSubscription(
    @JwtUser() { userId }: JwtDecoded,
    @Body() dto: CreateAppleSubscriptionDto,
  ) {
    return this.subscriptionService.createAppleSubscription(userId, {
      planType: dto.planType,
      originalTransactionId: dto.originalTransactionId,
      productId: dto.productId,
      receiptData: dto.receiptData ?? null,
      startDate: dto.startDate ? new Date(dto.startDate) : undefined,
      endDate:
        dto.endDate === undefined
          ? undefined
          : dto.endDate === null
            ? null
            : new Date(dto.endDate),
    })
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Apply/redeem a subscription code',
    description:
      'Apply a subscription code to activate a subscription for the current user',
  })
  @ApiBody({ type: ApplySubscriptionCodeDto })
  @ApiResponse({
    status: 200,
    type: SubscriptionResponseDto,
    description: 'Subscription created successfully',
  })
  @ApiBadRequestResponse({
    description: 'Invalid subscription code or code already used',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiNotFoundResponse({ description: 'Subscription code not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
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
  @ApiBody({ type: CreateSubscriptionCodeDto })
  @ApiResponse({
    status: 201,
    type: SubscriptionCodeResponseDto,
    description: 'Single code response when count=1',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Sale access required',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async createSubscriptionCode(@Body() dto: CreateSubscriptionCodeDto) {
    return this.subscriptionService.createSubscriptionCode(dto)
  }

  @Get('codes')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Search and list subscription codes (Admin or Sale only)',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    description: 'Search query (code or note)',
  })
  @ApiQuery({
    name: 'planType',
    required: false,
    enum: ['MONTHLY', 'YEARLY', 'LIFETIME'],
    description: 'Filter by plan type',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'USED', 'EXPIRED'],
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'perPage',
    required: false,
    type: Number,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    type: SubscriptionCodesListResponseDto,
    description: 'Subscription codes retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Sale access required',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async searchSubscriptionCodes(@Query() query: SearchSubscriptionCodesDto) {
    return this.subscriptionService.searchSubscriptionCodes(query)
  }

  @Get('code/:id')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Get subscription code by ID (Admin or Sale only)',
  })
  @ApiParam({ name: 'id', description: 'Subscription code ID' })
  @ApiResponse({
    status: 200,
    type: SubscriptionCodeResponseDto,
    description: 'Subscription code retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Sale access required',
  })
  @ApiNotFoundResponse({ description: 'Subscription code not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async getSubscriptionCode(@Param('id') id: string) {
    return this.subscriptionService.getSubscriptionCodeById(id)
  }

  @Put('code/:id')
  @UseGuards(AdminOrSaleGuard)
  @ApiOperation({
    summary: 'Update subscription code (Admin or Sale only)',
  })
  @ApiParam({ name: 'id', description: 'Subscription code ID' })
  @ApiBody({ type: CreateSubscriptionCodeDto, required: false })
  @ApiResponse({
    status: 200,
    type: SubscriptionCodeResponseDto,
    description: 'Subscription code updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Sale access required',
  })
  @ApiNotFoundResponse({ description: 'Subscription code not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
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
  @ApiParam({ name: 'id', description: 'Subscription code ID' })
  @ApiResponse({
    status: 200,
    description: 'Subscription code deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Subscription code deleted successfully',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Admin or Sale access required',
  })
  @ApiNotFoundResponse({ description: 'Subscription code not found' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async deleteSubscriptionCode(@Param('id') id: string) {
    return this.subscriptionService.deleteSubscriptionCode(id)
  }
}
