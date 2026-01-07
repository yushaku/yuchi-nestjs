import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const CreateVocabularyItemSchema = z.object({
  korean: z.string().min(1, 'Korean text is required'),
  hanja: z.string().optional().nullable(),
  vietnamese: z.string().min(1, 'Vietnamese translation is required'),
  pronunciation: z.string().min(1, 'Pronunciation is required'),
  example: z.string().optional().nullable(),
  exampleTranslation: z.string().optional().nullable(),
  categoryId: z.string().uuid('Invalid UUID format'),
})

const UpdateVocabularyItemSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  korean: z.string().min(1).optional(),
  hanja: z.string().optional().nullable(),
  vietnamese: z.string().min(1).optional(),
  pronunciation: z.string().min(1).optional(),
  example: z.string().optional().nullable(),
  exampleTranslation: z.string().optional().nullable(),
  categoryId: z.string().uuid('Invalid UUID format').optional(),
})

const BatchCreateVocabularySchema = z.object({
  items: z
    .array(CreateVocabularyItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchUpdateVocabularySchema = z.object({
  items: z
    .array(UpdateVocabularyItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchDeleteVocabularySchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid UUID format'))
    .min(1, 'At least one ID is required'),
})

export class CreateVocabularyItemDto extends createZodDto(
  CreateVocabularyItemSchema,
) {
  @ApiProperty({ description: 'Korean word', example: '안녕하세요' })
  korean: string

  @ApiPropertyOptional({ description: 'Hanja characters' })
  hanja?: string | null

  @ApiProperty({ description: 'Vietnamese translation', example: 'Xin chào' })
  vietnamese: string

  @ApiProperty({ description: 'Pronunciation', example: 'annyeonghaseyo' })
  pronunciation: string

  @ApiPropertyOptional({ description: 'Korean example sentence' })
  example?: string | null

  @ApiPropertyOptional({ description: 'Vietnamese translation of example' })
  exampleTranslation?: string | null

  @ApiProperty({ description: 'Category ID', example: 'uuid' })
  categoryId: string
}

export class UpdateVocabularyItemDto extends createZodDto(
  UpdateVocabularyItemSchema,
) {
  @ApiProperty({ description: 'Vocabulary ID', example: 'uuid' })
  id: string

  @ApiPropertyOptional({ description: 'Korean word' })
  korean?: string

  @ApiPropertyOptional({ description: 'Hanja characters' })
  hanja?: string | null

  @ApiPropertyOptional({ description: 'Vietnamese translation' })
  vietnamese?: string

  @ApiPropertyOptional({ description: 'Pronunciation' })
  pronunciation?: string

  @ApiPropertyOptional({ description: 'Korean example sentence' })
  example?: string | null

  @ApiPropertyOptional({ description: 'Vietnamese translation of example' })
  exampleTranslation?: string | null

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId?: string
}

export class BatchCreateVocabularyDto extends createZodDto(
  BatchCreateVocabularySchema,
) {
  @ApiProperty({
    type: [CreateVocabularyItemDto],
    description: 'Array of vocabularies to create',
  })
  items: CreateVocabularyItemDto[]
}

export class BatchUpdateVocabularyDto extends createZodDto(
  BatchUpdateVocabularySchema,
) {
  @ApiProperty({
    type: [UpdateVocabularyItemDto],
    description: 'Array of vocabularies to update',
  })
  items: UpdateVocabularyItemDto[]
}

export class BatchDeleteVocabularyDto extends createZodDto(
  BatchDeleteVocabularySchema,
) {
  @ApiProperty({
    type: [String],
    description: 'Array of vocabulary IDs to delete',
    example: ['uuid1', 'uuid2'],
  })
  ids: string[]
}
