import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PlanType } from '../../../generated/prisma/client'

const PlanTypeEnum = z.enum(PlanType)

export const CreateSubscriptionCodeSchema = z.object({
  planType: PlanTypeEnum,
  count: z.number().int().positive().max(100).optional().default(1),
  expiresAt: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export class CreateSubscriptionCodeDto extends createZodDto(
  CreateSubscriptionCodeSchema,
) {
  @ApiProperty({
    enum: PlanType,
    description: 'Plan type: MONTHLY, YEARLY, LIFETIME',
    example: PlanType.MONTHLY,
  })
  planType: PlanType

  @ApiPropertyOptional({
    description: 'Number of codes to create (default: 1, max: 100)',
    example: 1,
    minimum: 1,
    maximum: 100,
    default: 1,
  })
  count: number = 1

  @ApiPropertyOptional({
    description: 'Expiration date for the code (ISO 8601 string)',
    example: '2024-12-31T23:59:59Z',
  })
  expiresAt?: string

  @ApiPropertyOptional({
    description: 'Note for the code created by staff',
    example: 'Special discount for VIP users',
  })
  note?: string
}
