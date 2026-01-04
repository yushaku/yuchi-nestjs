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

  @ApiProperty({ type: [CategoryDto] })
  categories: CategoryDto[]

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
