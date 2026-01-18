import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum Role {
  ADMIN = 'ADMIN',
  SALE = 'SALE',
  MEMBER = 'MEMBER',
}

const RoleSchema = z.enum(['ADMIN', 'SALE', 'MEMBER'])

export const SearchUsersSchema = z.object({
  query: z.string().optional(),
  role: RoleSchema.optional(),
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

export class SearchUsersDto extends createZodDto(SearchUsersSchema) {
  @ApiPropertyOptional({ description: 'Search query (email or name)' })
  query?: string

  @ApiPropertyOptional({ enum: Role, description: 'Filter by role' })
  role?: Role

  @ApiProperty({ default: 1, required: false })
  page = 1

  @ApiProperty({ default: 20, required: false })
  perPage = 20

  get skip() {
    return (this.page - 1) * this.perPage
  }
}

export const UpdateUserRoleSchema = z.object({
  role: RoleSchema,
})

export class UpdateUserRoleDto extends createZodDto(UpdateUserRoleSchema) {
  @ApiProperty({ enum: Role, description: 'New role for user' })
  role: Role
}

export const CreateUserSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  name: z.string().optional(),
  role: RoleSchema.optional().default(Role.MEMBER),
})

export class CreateUserDto extends createZodDto(CreateUserSchema) {
  @ApiProperty({ description: 'User email' })
  email: string

  @ApiProperty({ description: 'User password (min 6 chars)' })
  password: string

  @ApiPropertyOptional({ description: 'User name' })
  name?: string

  @ApiPropertyOptional({
    enum: Role,
    default: Role.MEMBER,
    description: 'User role',
  })
  role: Role
}

export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  id: string

  @ApiProperty({ description: 'User email' })
  email: string

  @ApiPropertyOptional({ description: 'User name' })
  name: string | null

  @ApiProperty({ enum: Role, description: 'User role' })
  role: Role
}

export class UserInfoWithSubscriptionDto {
  @ApiProperty({ description: 'User ID' })
  id: string

  @ApiProperty({ description: 'User email' })
  email: string

  @ApiPropertyOptional({ description: 'User name' })
  name: string | null
  @ApiPropertyOptional({
    description: 'Current active subscription',
    example: {
      planType: 'MONTHLY',
      status: 'ACTIVE',
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-02-01T00:00:00.000Z',
    },
  })
  subscription?: {
    planType: string
    status: string
    startDate: Date
    endDate: Date | null
  } | null
}

export class UsersListResponseDto {
  @ApiProperty({ type: [UserResponseDto], description: 'List of users' })
  users: UserResponseDto[]

  @ApiProperty({ description: 'Total count' })
  total: number

  @ApiProperty({ description: 'Current page' })
  page: number

  @ApiProperty({ description: 'Items per page' })
  perPage: number

  @ApiProperty({ description: 'Total pages' })
  totalPages: number
}

export class ProficiencyStatisticDto {
  @ApiProperty({
    description: 'Proficiency level (0-9)',
    example: 0,
  })
  proficiency: number

  @ApiProperty({
    description: 'Number of words at this proficiency level',
    example: 20,
  })
  count: number
}

export class UserSummaryResponseDto {
  @ApiProperty({
    description: 'Total number of word progress records',
    example: 551,
  })
  total: number

  @ApiProperty({
    description: 'Total number of active words (isIgnored = false)',
    example: 541,
  })
  total_word_active: number

  @ApiProperty({
    description: 'Total number of inactive words (isIgnored = true)',
    example: 10,
  })
  total_word_inactive: number

  @ApiProperty({
    description: 'Number of words that have been reviewed (totalAttempts > 0)',
    example: 541,
  })
  review_count: number

  @ApiProperty({
    type: [ProficiencyStatisticDto],
    description: 'Statistics by proficiency level (0-9)',
  })
  statistic: ProficiencyStatisticDto[]
}
