import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  PlanType,
  CodeStatus,
  SubStatus,
} from '../../../generated/prisma/client'

const PlanTypeEnum = z.enum(PlanType)
const CodeStatusEnum = z.enum(CodeStatus)

export const SearchSubscriptionCodesSchema = z.object({
  query: z.string().optional(),
  planType: PlanTypeEnum.optional(),
  status: CodeStatusEnum.optional(),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .default('1')
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val
      return isNaN(num) ? 1 : num
    })
    .pipe(z.number().int().min(1)),
  perPage: z
    .union([z.string(), z.number()])
    .optional()
    .default('20')
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val
      return isNaN(num) ? 20 : num
    })
    .pipe(z.number().int().min(1)),
})

export class SearchSubscriptionCodesDto extends createZodDto(
  SearchSubscriptionCodesSchema,
) {
  @ApiPropertyOptional({ description: 'Search query (code or note)' })
  query?: string

  @ApiPropertyOptional({ enum: PlanType, description: 'Filter by plan type' })
  planType?: PlanType

  @ApiPropertyOptional({ enum: CodeStatus, description: 'Filter by status' })
  status?: CodeStatus

  @ApiProperty({ default: 1, required: false })
  page = 1

  @ApiProperty({ default: 20, required: false })
  perPage = 20

  get skip() {
    return (this.page - 1) * this.perPage
  }
}

export class SubscriptionCodeResponseDto {
  @ApiProperty({ description: 'Subscription code ID' })
  id: string

  @ApiProperty({ description: 'Unique code' })
  code: string

  @ApiProperty({ enum: PlanType, description: 'Plan type' })
  planType: PlanType

  @ApiProperty({ enum: CodeStatus, description: 'Code status' })
  status: CodeStatus

  @ApiPropertyOptional({ description: 'Expiration date' })
  expiresAt: Date | null

  @ApiPropertyOptional({ description: 'Used at date' })
  usedAt: Date | null

  @ApiPropertyOptional({ description: 'User ID who used the code' })
  usedBy: string | null

  @ApiPropertyOptional({ description: 'Note' })
  note: string | null

  @ApiProperty({ description: 'Created at' })
  createdAt: Date

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date
}

export class SubscriptionCodesListResponseDto {
  @ApiProperty({
    type: [SubscriptionCodeResponseDto],
    description: 'List of codes',
  })
  codes: SubscriptionCodeResponseDto[]

  @ApiProperty({ description: 'Total count' })
  total: number

  @ApiProperty({ description: 'Current page' })
  page: number

  @ApiProperty({ description: 'Items per page' })
  perPage: number

  @ApiProperty({ description: 'Total pages' })
  totalPages: number
}

export class SubscriptionResponseDto {
  @ApiProperty({ description: 'Subscription ID' })
  id: string

  @ApiProperty({ description: 'User ID' })
  userId: string

  @ApiProperty({ enum: PlanType, description: 'Plan type' })
  planType: PlanType

  @ApiProperty({ enum: SubStatus, description: 'Subscription status' })
  status: SubStatus

  @ApiProperty({ description: 'Start date' })
  startDate: Date

  @ApiPropertyOptional({ description: 'End date (null for lifetime)' })
  endDate: Date | null

  @ApiPropertyOptional({ description: 'Code ID used for this subscription' })
  codeId: string | null

  @ApiProperty({ description: 'Created at' })
  createdAt: Date

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date

  @ApiPropertyOptional({ type: SubscriptionCodeResponseDto })
  code?: SubscriptionCodeResponseDto
}
