import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PlanType } from '../../../generated/prisma/client'

const PlanTypeEnum = z.enum(PlanType)

// ISO 8601 datetime regex pattern
const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/

export const CreateGooglePlaySubscriptionSchema = z.object({
  planType: PlanTypeEnum,
  purchaseToken: z.string().min(1, 'purchaseToken is required'),
  subscriptionId: z.string().min(1, 'subscriptionId is required'),
  orderId: z.string().optional().nullable(),
  startDate: z
    .string()
    .regex(isoDateTimeRegex, 'startDate must be a valid ISO 8601 datetime')
    .optional(),
  endDate: z
    .string()
    .regex(isoDateTimeRegex, 'endDate must be a valid ISO 8601 datetime')
    .nullable()
    .optional(),
})

export class CreateGooglePlaySubscriptionDto extends createZodDto(
  CreateGooglePlaySubscriptionSchema,
) {
  @ApiProperty({ enum: PlanType, description: 'Plan type' })
  planType: PlanType

  @ApiProperty({ description: 'Google Play purchase token' })
  purchaseToken: string

  @ApiProperty({ description: 'Google Play subscription product ID' })
  subscriptionId: string

  @ApiPropertyOptional({ description: 'Google Play order ID (if available)' })
  orderId?: string | null

  @ApiPropertyOptional({
    description: 'Start date (ISO 8601). Defaults to now if omitted.',
  })
  startDate?: string

  @ApiPropertyOptional({
    description:
      'End date (ISO 8601). If omitted, server will compute from planType; null allowed for lifetime.',
  })
  endDate?: string | null
}
