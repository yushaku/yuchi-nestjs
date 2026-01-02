import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator'

export enum Platform {
  WEB = 'web',
  IOS = 'ios',
  ANDROID = 'android',
}

export class GoogleAuthDto {
  @ApiProperty({
    enum: Platform,
    description: 'Platform type: web, ios, or android',
  })
  @IsEnum(Platform)
  platform: Platform

  @ApiPropertyOptional({
    description: 'Mobile app deep link scheme (e.g., yuchiapp://)',
  })
  @IsString()
  @IsOptional()
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

export class LoginDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email: string

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string
}

export class RegisterDto {
  @ApiProperty({ description: 'User email' })
  @IsEmail()
  email: string

  @ApiProperty({ description: 'User password' })
  @IsString()
  password: string

  @ApiProperty({ description: 'User name', required: false })
  @IsString()
  @IsOptional()
  name?: string
}
