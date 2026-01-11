import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { JWTService } from '../shared/jwt.service'
import { PrismaService } from '@/shared/prisma.service'
import { AuthResponseDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client
  private googleClientId: string

  constructor(
    private prisma: PrismaService,
    private jwt: JWTService,
    private config: ConfigService,
  ) {
    this.googleClientId = this.config.get('GOOGLE_CLIENT_ID')
    this.googleClient = new OAuth2Client(this.googleClientId)
  }

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

  async googleAuthWithIdToken(idToken: string): Promise<AuthResponseDto> {
    try {
      // Verify the ID token with Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      })

      const payload = ticket.getPayload()
      if (!payload) {
        throw new UnauthorizedException('Invalid Google ID token')
      }

      const { email, name, sub: googleId } = payload

      if (!email) {
        throw new UnauthorizedException('Email not provided by Google')
      }

      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { email },
      })

      // Create user if doesn't exist
      if (!user) {
        user = await this.prisma.user.create({
          data: {
            email,
            password: `google-${googleId}`, // Store Google ID as password identifier
            name: name || null,
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
    } catch (error) {
      console.error('Google ID token verification error:', error)
      throw new UnauthorizedException('Invalid Google ID token')
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
