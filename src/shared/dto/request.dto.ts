import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty } from '@nestjs/swagger'

export const PaginationSchema = z.object({
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

export class PaginationDto extends createZodDto(PaginationSchema) {
  @ApiProperty({ default: 1, required: false })
  page = 1

  @ApiProperty({ default: 20, required: false })
  perPage = 20

  get skip() {
    return (this.page - 1) * this.perPage
  }
}
