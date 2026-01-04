import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { JWTService } from '../shared/jwt.service'
import { PrismaService } from '@/shared/prisma.service'
import { AuthResponseDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JWTService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const tokens = this.jwt.genToken({ userId: user.id, role: user.role })

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  async register(data: {
    email: string
    password: string
    name?: string
  }): Promise<AuthResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existingUser) {
      throw new UnauthorizedException('User already exists')
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name || null,
      },
    })

    const tokens = this.jwt.genToken({ userId: user.id, role: user.role })

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  async googleAuth(profile: {
    email: string
    name: string
    password: string
  }): Promise<AuthResponseDto> {
    // Check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    })

    // Create user if doesn't exist
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          password: profile.password, // This is the provider-id format
          name: profile.name,
        },
      })
    }

    const tokens = this.jwt.genToken({ userId: user.id, role: user.role })

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    }
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    const newAccessToken = await this.jwt.refreshToken(refreshToken)
    if (!newAccessToken) {
      throw new UnauthorizedException('Invalid refresh token')
    }
    return { access_token: newAccessToken }
  }
}
