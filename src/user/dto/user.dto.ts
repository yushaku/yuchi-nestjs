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
