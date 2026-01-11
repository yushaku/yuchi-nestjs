import { JwtService } from '@nestjs/jwt'

/**
 * Auth helper for e2e tests
 * Provides utilities to generate JWT tokens for testing
 */
export class AuthHelper {
  private jwtService: JwtService

  constructor() {
    // Use the same JWT secret as the app
    const jwtSecret = process.env.JWT_SECRET || 'test-secret'
    this.jwtService = new JwtService({
      secret: jwtSecret,
      signOptions: {
        expiresIn: process.env.JWT_EXPIRED_TIME || '1h',
      },
    })
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(userId: string, role: string = 'MEMBER'): string {
    return this.jwtService.sign({ userId, role })
  }

  /**
   * Get authorization header value
   */
  getAuthHeader(userId: string, role: string = 'MEMBER'): string {
    const token = this.generateToken(userId, role)
    return `Bearer ${token}`
  }
}
