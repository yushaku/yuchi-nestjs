import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

const CreateQuizQuestionItemSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  questionTranslation: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).min(2, 'At least 2 options are required'),
  correctAnswer: z.string().min(1, 'Correct answer is required'),
  explanation: z.string().optional().nullable(),
  VocabularyId: z.string().uuid('Invalid UUID format'),
})

const UpdateQuizQuestionItemSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
  question: z.string().min(1).optional(),
  questionTranslation: z.string().optional().nullable(),
  options: z.array(z.string().min(1)).min(2).optional(),
  correctAnswer: z.string().min(1).optional(),
  explanation: z.string().optional().nullable(),
  VocabularyId: z.string().uuid('Invalid UUID format').optional(),
})

const BatchCreateQuizQuestionSchema = z.object({
  items: z
    .array(CreateQuizQuestionItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchUpdateQuizQuestionSchema = z.object({
  items: z
    .array(UpdateQuizQuestionItemSchema)
    .min(1, 'At least one item is required'),
})

const BatchDeleteQuizQuestionSchema = z.object({
  ids: z
    .array(z.string().uuid('Invalid UUID format'))
    .min(1, 'At least one ID is required'),
})

export class CreateQuizQuestionItemDto extends createZodDto(
  CreateQuizQuestionItemSchema,
) {
  @ApiProperty({
    description: 'Korean question',
    example: '안녕하세요는 무슨 뜻인가요?',
  })
  question: string

  @ApiPropertyOptional({ description: 'Vietnamese translation of question' })
  questionTranslation?: string | null

  @ApiProperty({
    type: [String],
    description: 'Array of answer options',
    example: ['Xin chào', 'Tạm biệt', 'Cảm ơn'],
  })
  options: string[]

  @ApiProperty({ description: 'Correct answer', example: 'Xin chào' })
  correctAnswer: string

  @ApiPropertyOptional({ description: 'Explanation in Vietnamese' })
  explanation?: string | null

  @ApiProperty({ description: 'Vocabulary ID', example: 'uuid' })
  VocabularyId: string
}

export class UpdateQuizQuestionItemDto extends createZodDto(
  UpdateQuizQuestionItemSchema,
) {
  @ApiProperty({ description: 'Quiz question ID', example: 'uuid' })
  id: string

  @ApiPropertyOptional({ description: 'Korean question' })
  question?: string

  @ApiPropertyOptional({ description: 'Vietnamese translation of question' })
  questionTranslation?: string | null

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of answer options',
  })
  options?: string[]

  @ApiPropertyOptional({ description: 'Correct answer' })
  correctAnswer?: string

  @ApiPropertyOptional({ description: 'Explanation in Vietnamese' })
  explanation?: string | null

  @ApiPropertyOptional({ description: 'Vocabulary ID' })
  VocabularyId?: string
}

export class BatchCreateQuizQuestionDto extends createZodDto(
  BatchCreateQuizQuestionSchema,
) {
  @ApiProperty({
    type: [CreateQuizQuestionItemDto],
    description: 'Array of quiz questions to create',
  })
  items: CreateQuizQuestionItemDto[]
}

export class BatchUpdateQuizQuestionDto extends createZodDto(
  BatchUpdateQuizQuestionSchema,
) {
  @ApiProperty({
    type: [UpdateQuizQuestionItemDto],
    description: 'Array of quiz questions to update',
  })
  items: UpdateQuizQuestionItemDto[]
}

export class BatchDeleteQuizQuestionDto extends createZodDto(
  BatchDeleteQuizQuestionSchema,
) {
  @ApiProperty({
    type: [String],
    description: 'Array of quiz question IDs to delete',
    example: ['uuid1', 'uuid2'],
  })
  ids: string[]
}
