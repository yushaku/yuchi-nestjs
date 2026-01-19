import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PlanType } from '../../../generated/prisma/client'

const PlanTypeEnum = z.enum(PlanType)

// ISO 8601 datetime regex pattern
const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/

export const CreateAppleSubscriptionSchema = z.object({
  planType: PlanTypeEnum,
  originalTransactionId: z.string().min(1, 'originalTransactionId is required'),
  productId: z.string().min(1, 'productId is required'),
  receiptData: z.string().optional().nullable(),
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

export class CreateAppleSubscriptionDto extends createZodDto(
  CreateAppleSubscriptionSchema,
) {
  @ApiProperty({ enum: PlanType, description: 'Plan type' })
  planType: PlanType

  @ApiProperty({ description: 'Apple original transaction id' })
  originalTransactionId: string

  @ApiProperty({ description: 'Apple product id' })
  productId: string

  @ApiPropertyOptional({
    description: 'Receipt data (if client wants server-side verification)',
  })
  receiptData?: string | null

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
