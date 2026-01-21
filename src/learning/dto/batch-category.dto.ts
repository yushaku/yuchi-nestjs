import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const CreateCategoryItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  topikLevel: z.number().int().min(1).max(3).optional().nullable(),
  groupId: z.uuid('Invalid UUID format').optional().nullable(),
  isNeedPremium: z.boolean().default(true),
})

const UpdateCategoryItemSchema = z.object({
  id: z.uuid('Invalid UUID format'),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
  topikLevel: z.number().int().min(1).max(3).optional().nullable(),
  groupId: z.string().uuid('Invalid UUID format').optional().nullable(),
  isNeedPremium: z.boolean().optional(),
})

const BatchCreateCategorySchema = z.object({
  items: z
    .array(CreateCategoryItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchUpdateCategorySchema = z.object({
  items: z
    .array(UpdateCategoryItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchDeleteCategorySchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid UUID format'))
    .min(1, 'At least one ID is required'),
})

export class CreateCategoryItemDto extends createZodDto(
  CreateCategoryItemSchema,
) {
  @ApiProperty({ description: 'Category name', example: '인사 (Chào hỏi)' })
  name: string

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string | null

  @ApiPropertyOptional({ description: 'Icon emoji', example: '👋' })
  icon?: string | null

  @ApiProperty({ description: 'Display order', example: 0, default: 0 })
  order: number

  @ApiPropertyOptional({
    description: 'TOPIK level (1, 2, or 3)',
    minimum: 1,
    maximum: 3,
  })
  topikLevel?: number | null

  @ApiPropertyOptional({ description: 'Learning group ID', example: 'uuid' })
  groupId?: string | null

  @ApiProperty({
    description: 'Whether this category requires a premium subscription',
    default: true,
  })
  isNeedPremium: boolean
}

export class UpdateCategoryItemDto extends createZodDto(
  UpdateCategoryItemSchema,
) {
  @ApiProperty({ description: 'Category ID', example: 'uuid' })
  id: string

  @ApiPropertyOptional({ description: 'Category name' })
  name?: string

  @ApiPropertyOptional({ description: 'Category description' })
  description?: string | null

  @ApiPropertyOptional({ description: 'Icon emoji' })
  icon?: string | null

  @ApiPropertyOptional({ description: 'Display order' })
  order?: number

  @ApiPropertyOptional({
    description: 'TOPIK level (1, 2, or 3)',
    minimum: 1,
    maximum: 3,
  })
  topikLevel?: number | null

  @ApiPropertyOptional({ description: 'Learning group ID' })
  groupId?: string | null

  @ApiPropertyOptional({
    description: 'Whether this category requires a premium subscription',
  })
  isNeedPremium?: boolean
}

export class BatchCreateCategoryDto extends createZodDto(
  BatchCreateCategorySchema,
) {
  @ApiProperty({
    type: [CreateCategoryItemDto],
    description: 'Array of categories to create',
  })
  items: CreateCategoryItemDto[]
}

export class BatchUpdateCategoryDto extends createZodDto(
  BatchUpdateCategorySchema,
) {
  @ApiProperty({
    type: [UpdateCategoryItemDto],
    description: 'Array of categories to update',
  })
  items: UpdateCategoryItemDto[]
}

export class BatchDeleteCategoryDto extends createZodDto(
  BatchDeleteCategorySchema,
) {
  @ApiProperty({
    type: [String],
    description: 'Array of category IDs to delete',
    example: ['uuid1', 'uuid2'],
  })
  ids: string[]
}
