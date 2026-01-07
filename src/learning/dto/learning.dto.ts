import { ApiProperty } from '@nestjs/swagger'

export class CategoryDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty({ required: false, nullable: true })
  description?: string | null

  @ApiProperty({ required: false, nullable: true })
  icon?: string | null

  @ApiProperty()
  order: number

  @ApiProperty({ required: false, nullable: true })
  topikLevel?: number | null

  @ApiProperty({ required: false, nullable: true })
  groupId?: string | null

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class LearningGroupDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty({ required: false, nullable: true })
  icon?: string | null

  @ApiProperty()
  topikLevel: number

  @ApiProperty({ type: [CategoryDto], required: false })
  categories?: CategoryDto[]

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class VocabularyDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  korean: string

  @ApiProperty({ required: false, nullable: true })
  hanja?: string | null

  @ApiProperty()
  vietnamese: string

  @ApiProperty()
  pronunciation: string

  @ApiProperty({ required: false, nullable: true })
  example?: string | null

  @ApiProperty({ required: false, nullable: true })
  exampleTranslation?: string | null

  @ApiProperty()
  categoryId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

export class QuizQuestionDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  question: string

  @ApiProperty({ required: false, nullable: true })
  questionTranslation?: string | null

  @ApiProperty({ type: [String] })
  options: string[]

  @ApiProperty()
  correctAnswer: string

  @ApiProperty({ required: false, nullable: true })
  explanation?: string | null

  @ApiProperty()
  VocabularyId: string

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}

// Batch operation response DTOs
export class BatchResponseDto<T> {
  @ApiProperty({ description: 'Number of items created/updated/deleted' })
  count: number

  @ApiProperty({ description: 'Array of created/updated items' })
  items: T[]
}

export class BatchDeleteResponseDto {
  @ApiProperty({ description: 'Number of items deleted' })
  count: number

  @ApiProperty({ type: [String], description: 'Array of deleted IDs' })
  deletedIds: string[]
}
