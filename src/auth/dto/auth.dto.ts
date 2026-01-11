import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { ApiProperty } from '@nestjs/swagger'

export const GoogleIdTokenSchema = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
})

export class GoogleIdTokenDto extends createZodDto(GoogleIdTokenSchema) {
  @ApiProperty({
    description:
      'Google ID token from client (typically from mobile apps or web Google Sign-In)',
  })
  idToken: string
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
