import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { OAuth2Client } from 'google-auth-library'
import { JWTService } from '../shared/jwt.service'
import { PrismaService } from '@/shared/prisma.service'
import { AuthResponseDto } from './dto/auth.dto'
import { SubStatus } from '../../generated/prisma/client'

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client
  private googleClientIds: string[] = []

  constructor(
    private prisma: PrismaService,
    private jwt: JWTService,
    private config: ConfigService,
  ) {
    const webClientId = this.config.get('GOOGLE_CLIENT_ID')
    const androidClientId = this.config.get('GOOGLE_CLIENT_ANDROID_ID')
    const iosClientId = this.config.get('GOOGLE_CLIENT_IOS_ID')

    if (webClientId) this.googleClientIds.push(webClientId)
    if (androidClientId) this.googleClientIds.push(androidClientId)
    if (iosClientId) this.googleClientIds.push(iosClientId)

    // Use the first client ID (web) for OAuth2Client initialization
    // The verifyIdToken will check against all client IDs
    this.googleClient = new OAuth2Client()
  }

  /**
   * Get active subscription end date for a user
   * Returns Unix timestamp in milliseconds, or null if no active subscription
   * For lifetime subscriptions (endDate is null), returns a far future timestamp
   */
  private async getSubscriptionEndDate(userId: string): Promise<number | null> {
    const now = new Date()
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubStatus.ACTIVE,
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      orderBy: {
        startDate: 'desc',
      },
      select: {
        endDate: true,
      },
    })

    if (!activeSubscription) {
      return null
    }

    // null endDate means lifetime subscription - use a far future timestamp
    if (!activeSubscription.endDate) {
      // Return year 2100 timestamp (far future)
      return new Date('2100-01-01').getTime()
    }

    // Return Unix timestamp in milliseconds
    return activeSubscription.endDate.getTime()
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

    const subscriptionEndDate = await this.getSubscriptionEndDate(user.id)
    const tokens = this.jwt.genToken({
      userId: user.id,
      role: user.role,
      subscriptionEndDate,
    })

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

    const subscriptionEndDate = await this.getSubscriptionEndDate(user.id)
    const tokens = this.jwt.genToken({
      userId: user.id,
      role: user.role,
      subscriptionEndDate,
    })

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
      // Verify the ID token with Google against all available client IDs
      // This supports web, Android, and iOS clients
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientIds,
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

      const subscriptionEndDate = await this.getSubscriptionEndDate(user.id)
      const tokens = this.jwt.genToken({
        userId: user.id,
        role: user.role,
        subscriptionEndDate,
      })

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
    // Verify refresh token and get user info
    const payload = await this.jwt.validateRefreshToken(refreshToken)
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    // Re-fetch subscription end date (it might have changed)
    const subscriptionEndDate = await this.getSubscriptionEndDate(
      payload.userId,
    )

    // Generate new access token with updated subscription info
    const newAccessToken = this.jwt.createAccessToken({
      userId: payload.userId,
      role: payload.role,
      subscriptionEndDate,
    })

    return { access_token: newAccessToken }
  }
}
