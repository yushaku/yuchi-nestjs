import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// Schema for individual word progress item
const WordProgressSyncItemSchema = z.object({
  vocabId: z.uuid('Invalid vocabId UUID format'),
  reviewLevel: z.number().int().min(0).max(4, 'Review level must be 0-4'),
  isIgnored: z.boolean().default(false),
  lastReviewed: z
    .number()
    .int()
    .positive('Last reviewed must be a positive timestamp'),
  nextReview: z
    .number()
    .int()
    .positive('Next review must be a positive timestamp'),
  correctCount: z.number().int().min(0).default(0),
  totalAttempts: z.number().int().min(0).default(0),
})

// Schema for sync request
const SyncWordProgressSchema = z.object({
  lastSyncedAt: z.number().int().positive().optional().nullable(),
  localChanges: z
    .array(WordProgressSyncItemSchema)
    .min(0, 'Local changes array cannot be negative'),
})

export class WordProgressSyncItemDto extends createZodDto(
  WordProgressSyncItemSchema,
) {
  @ApiProperty({ description: 'Vocabulary ID', example: 'uuid' })
  vocabId: string

  @ApiProperty({
    description: 'Review level (0-4)',
    example: 2,
    minimum: 0,
    maximum: 4,
  })
  reviewLevel: number

  @ApiProperty({
    description: 'Whether word is ignored',
    example: false,
    default: false,
  })
  isIgnored: boolean

  @ApiProperty({
    description: 'Last reviewed timestamp (Unix timestamp in milliseconds)',
    example: 1704067200000,
  })
  lastReviewed: number

  @ApiProperty({
    description: 'Next review timestamp (Unix timestamp in milliseconds)',
    example: 1704153600000,
  })
  nextReview: number

  @ApiProperty({
    description: 'Number of correct answers',
    example: 5,
    default: 0,
  })
  correctCount: number

  @ApiProperty({
    description: 'Total number of attempts',
    example: 7,
    default: 0,
  })
  totalAttempts: number
}

export class SyncWordProgressDto extends createZodDto(SyncWordProgressSchema) {
  @ApiPropertyOptional({
    description:
      'Timestamp of last sync (Unix timestamp in milliseconds, null for full sync, undefined to skip server changes)',
    example: 1704067200000,
    nullable: true,
  })
  lastSyncedAt?: number | null

  @ApiProperty({
    type: [WordProgressSyncItemDto],
    description: 'Array of local word progress changes',
  })
  localChanges: WordProgressSyncItemDto[]
}

// Response DTOs
export class QuizQuestionResponseDto {
  @ApiProperty({ description: 'Question in Korean' })
  question: string

  @ApiProperty({
    description: 'Question translation in Vietnamese',
    nullable: true,
    required: false,
  })
  question_translation?: string | null

  @ApiProperty({
    type: [String],
    description: 'Array of answer options',
  })
  options: string[]

  @ApiProperty({ description: 'Correct answer' })
  correct_answer: string

  @ApiProperty({
    description: 'Explanation in Vietnamese',
    nullable: true,
    required: false,
  })
  explanation?: string | null
}

export class WordProgressResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId: string

  @ApiProperty({ description: 'Vocabulary ID' })
  vocabId: string

  @ApiProperty({ description: 'Review level (0-4)' })
  reviewLevel: number

  @ApiProperty({ description: 'Whether word is ignored' })
  isIgnored: boolean

  @ApiProperty({
    description: 'Last reviewed timestamp (Unix timestamp in milliseconds)',
    example: 1704067200000,
  })
  lastReviewed: number

  @ApiProperty({
    description: 'Next review timestamp (Unix timestamp in milliseconds)',
    example: 1704153600000,
  })
  nextReview: number

  @ApiProperty({ description: 'Number of correct answers' })
  correctCount: number

  @ApiProperty({ description: 'Total number of attempts' })
  totalAttempts: number

  // Vocabulary data
  @ApiProperty({ description: 'Korean word' })
  korean: string

  @ApiProperty({
    description: 'Hanja characters',
    nullable: true,
    required: false,
  })
  hanja?: string | null

  @ApiProperty({ description: 'Vietnamese translation' })
  vietnamese: string

  @ApiProperty({ description: 'Pronunciation' })
  pronunciation: string

  @ApiProperty({
    description: 'Example sentence in Korean',
    nullable: true,
    required: false,
  })
  example?: string | null

  @ApiProperty({
    description: 'Example sentence translation in Vietnamese',
    nullable: true,
    required: false,
  })
  example_translation?: string | null

  // Quiz data
  @ApiProperty({
    type: [QuizQuestionResponseDto],
    description: 'Array of quiz questions',
  })
  quiz: QuizQuestionResponseDto[]
}

export class ConflictInfoDto {
  @ApiProperty({ description: 'Vocabulary ID with conflict' })
  vocabId: string

  @ApiProperty({ description: 'Client version of the data' })
  client: WordProgressSyncItemDto

  @ApiProperty({ description: 'Server version of the data' })
  server: WordProgressResponseDto

  @ApiProperty({
    description: 'Reason for conflict',
    example: 'Server has newer lastReviewed timestamp',
  })
  reason: string
}

export class SyncWordProgressResponseDto {
  @ApiProperty({
    type: [WordProgressResponseDto],
    description: 'Server changes since lastSyncedAt',
  })
  serverChanges: WordProgressResponseDto[]

  @ApiProperty({
    type: [ConflictInfoDto],
    description: 'Conflicts that occurred during sync',
  })
  conflicts: ConflictInfoDto[]

  @ApiProperty({
    description:
      'Timestamp of this sync operation (Unix timestamp in milliseconds)',
    example: 1704067200000,
  })
  syncedAt: number
}

// ============================================
// PUSH DTOs - Mobile app sends pending sync data
// ============================================

const PushWordProgressSchema = z.object({
  wordProgresses: z
    .array(WordProgressSyncItemSchema)
    .min(1, 'At least one word progress is required'),
})

export class PushWordProgressDto extends createZodDto(PushWordProgressSchema) {
  @ApiProperty({
    type: [WordProgressSyncItemDto],
    description:
      'Array of word progress data to sync (from pending_sync_ids table)',
  })
  wordProgresses: WordProgressSyncItemDto[]
}

export class PushWordProgressResponseDto {
  @ApiProperty({
    description: 'Whether the push was successful',
    example: true,
  })
  success: boolean

  @ApiProperty({
    description: 'Number of records successfully synced',
    example: 10,
  })
  syncedCount: number

  @ApiProperty({
    description:
      'Timestamp of this sync operation (Unix timestamp in milliseconds)',
    example: 1704067200000,
  })
  syncedAt: number
}

// ============================================
// PULL DTOs - Mobile app pulls updated data
// ============================================

const PullWordProgressSchema = z.object({
  lastSyncTime: z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val) => {
      if (!val || val === 'null' || val === '0') return null
      if (typeof val === 'string') {
        const num = parseInt(val, 10)
        return isNaN(num) ? null : num
      }
      return typeof val === 'number' ? val : null
    })
    .pipe(z.number().int().positive().nullable().optional()),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .default('1')
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val
      return isNaN(num) ? 1 : num
    })
    .pipe(z.number().int().min(1)),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .default('50')
    .transform((val) => {
      const num = typeof val === 'string' ? parseInt(val, 10) : val
      return isNaN(num) ? 50 : num
    })
    .pipe(z.number().int().min(1).max(100)),
})

export class PullWordProgressDto extends createZodDto(PullWordProgressSchema) {
  @ApiPropertyOptional({
    description:
      'Timestamp of last sync (Unix timestamp in milliseconds, null or 0 for full sync, first time login)',
    example: 1704067200000,
    nullable: true,
  })
  lastSyncTime?: number | null

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    default: 1,
    minimum: 1,
  })
  page?: number

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 50,
    default: 50,
    minimum: 1,
    maximum: 100,
  })
  limit?: number
}

export class PullWordProgressResponseDto {
  @ApiProperty({
    type: [WordProgressResponseDto],
    description: 'Array of word progress records updated after lastSyncTime',
  })
  data: WordProgressResponseDto[]

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number

  @ApiProperty({
    description: 'Number of records per page',
    example: 50,
  })
  limit: number

  @ApiProperty({
    description: 'Total number of records available',
    example: 150,
  })
  total: number

  @ApiProperty({
    description: 'Total number of pages',
    example: 3,
  })
  totalPages: number

  @ApiProperty({
    description: 'Whether there are more pages',
    example: true,
  })
  hasMore: boolean
}
