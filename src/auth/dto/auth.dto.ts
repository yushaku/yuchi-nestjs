import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum Platform {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android',
}

const PlatformSchema = z.enum(Platform)

export const GoogleAuthSchema = z.object({
  platform: PlatformSchema,
  deepLinkScheme: z.string().optional(),
})

export class GoogleAuthDto extends createZodDto(GoogleAuthSchema) {
  @ApiProperty({
    enum: Platform,
    description: 'Platform type: web, ios, or android',
  })
  platform: Platform

  @ApiPropertyOptional({
    description: 'Mobile app deep link scheme (e.g., yuchiapp://)',
  })
  deepLinkScheme?: string
}

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  access_token: string

  @ApiProperty({ description: 'JWT refresh token' })
  refresh_token: string

  @ApiProperty({ description: 'User information' })
  user: {
    id: string
    email: string
    name: string | null
  }
}

export const LoginSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
})

export class LoginDto extends createZodDto(LoginSchema) {
  @ApiProperty({ description: 'User email' })
  email: string

  @ApiProperty({ description: 'User password' })
  password: string
}

export const RegisterSchema = z.object({
  email: z.email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  name: z.string().optional(),
})

export class RegisterDto extends createZodDto(RegisterSchema) {
  @ApiProperty({ description: 'User email' })
  email: string

  @ApiProperty({ description: 'User password' })
  password: string

  @ApiProperty({ description: 'User name', required: false })
  name?: string
}
