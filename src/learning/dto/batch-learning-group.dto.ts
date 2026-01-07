import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const CreateLearningGroupItemSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  icon: z.string().optional().nullable(),
  topikLevel: z.number().int().min(1).max(3),
})

const UpdateLearningGroupItemSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  name: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
  topikLevel: z.number().int().min(1).max(3).optional(),
})

const BatchCreateLearningGroupSchema = z.object({
  items: z
    .array(CreateLearningGroupItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchUpdateLearningGroupSchema = z.object({
  items: z
    .array(UpdateLearningGroupItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchDeleteLearningGroupSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid UUID format'))
    .min(1, 'At least one ID is required'),
})

export class CreateLearningGroupItemDto extends createZodDto(
  CreateLearningGroupItemSchema,
) {
  @ApiProperty({
    description: 'Learning group name',
    example: 'Chào hỏi & Thông tin cá nhân',
  })
  name: string

  @ApiPropertyOptional({ description: 'Icon emoji', example: '👋' })
  icon?: string | null

  @ApiProperty({
    description: 'TOPIK level (1, 2, or 3)',
    example: 1,
    minimum: 1,
    maximum: 3,
  })
  topikLevel: number
}

export class UpdateLearningGroupItemDto extends createZodDto(
  UpdateLearningGroupItemSchema,
) {
  @ApiProperty({ description: 'Learning group ID', example: 'uuid' })
  id: string

  @ApiPropertyOptional({ description: 'Learning group name' })
  name?: string

  @ApiPropertyOptional({ description: 'Icon emoji' })
  icon?: string | null

  @ApiPropertyOptional({
    description: 'TOPIK level (1, 2, or 3)',
    minimum: 1,
    maximum: 3,
  })
  topikLevel?: number
}

export class BatchCreateLearningGroupDto extends createZodDto(
  BatchCreateLearningGroupSchema,
) {
  @ApiProperty({
    type: [CreateLearningGroupItemDto],
    description: 'Array of learning groups to create',
  })
  items: CreateLearningGroupItemDto[]
}

export class BatchUpdateLearningGroupDto extends createZodDto(
  BatchUpdateLearningGroupSchema,
) {
  @ApiProperty({
    type: [UpdateLearningGroupItemDto],
    description: 'Array of learning groups to update',
  })
  items: UpdateLearningGroupItemDto[]
}

export class BatchDeleteLearningGroupDto extends createZodDto(
  BatchDeleteLearningGroupSchema,
) {
  @ApiProperty({
    type: [String],
    description: 'Array of learning group IDs to delete',
    example: ['uuid1', 'uuid2'],
  })
  ids: string[]
}
