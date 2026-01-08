import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty } from '@nestjs/swagger'

export const ApplySubscriptionCodeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
})

export class ApplySubscriptionCodeDto extends createZodDto(
  ApplySubscriptionCodeSchema,
) {
  @ApiProperty({
    description: 'Subscription code to apply',
    example: 'PROMO2024ABC123',
  })
  code: string
}
