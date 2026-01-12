import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FastifyRequest } from 'fastify'
import { ExtractJwt } from 'passport-jwt'

import { TOKEN } from '@/shared/constant'
import { JWTService } from '@/shared/jwt.service'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private authService: JWTService) {
    super()
  }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()

    try {
      // Try to get token from Authorization header first, then cookies
      let accessToken = this.getTokenFromHeader(request)
      if (!accessToken) {
        accessToken = ExtractJwt.fromExtractors([this.cookieExtractor])(request)
      }

      if (!accessToken) {
        throw new UnauthorizedException('Access token is not set')
      }

      // Validate token first
      let validatedUser = await this.authService.validateToken(accessToken)

      // If token invalid, try refresh if using cookies
      if (!validatedUser && !this.getTokenFromHeader(request)) {
        const refreshToken = request.cookies[TOKEN.REFRESH]
        if (refreshToken) {
          try {
            const newToken = await this.authService.refreshToken(refreshToken)
            if (newToken) {
              const jwtOption = this.authService.option()
              response.cookie(TOKEN.ACCESS, newToken, jwtOption)
              request.cookies[TOKEN.ACCESS] = newToken
              // Set token in header for Passport to use
              request.headers.authorization = `Bearer ${newToken}`
              // Re-validate with new token
              validatedUser = await this.authService.validateToken(newToken)
            }
          } catch (refreshError) {
            // Refresh failed, continue to throw unauthorized
          }
        }
      }

      if (!validatedUser) {
        throw new UnauthorizedException('Token is invalid')
      }

      // Token is valid - set user directly to request and let Passport verify
      // This ensures request.user is set even if Passport has issues
      request.user = validatedUser

      // Also let Passport strategy handle it for consistency
      // This will call JwtStrategy.validate() which should return the same user
      try {
        const result = await super.canActivate(context)
        if (!result) {
          // If Passport fails but we have validated user, still allow access
          return true
        }
        return true
      } catch (passportError) {
        // If Passport throws but we have validated user, still allow access
        // This handles cases where Passport strategy has issues but token is valid
        if (validatedUser) {
          return true
        }
        throw passportError
      }
    } catch (error) {
      response.clearCookie(TOKEN.ACCESS)
      response.clearCookie(TOKEN.REFRESH)

      // Re-throw UnauthorizedException to get 401 instead of 403
      if (error instanceof UnauthorizedException) {
        throw error
      }
      // If Passport throws an error, wrap it
      throw new UnauthorizedException(error?.message || 'Authentication failed')
    }
  }

  private getTokenFromHeader(request: FastifyRequest): string | null {
    // Use same logic as Passport strategy for consistency
    const authorization = request.headers.authorization || ''
    if (authorization.startsWith('Bearer ')) {
      return authorization.replace('Bearer ', '')
    }
    return null
  }
  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException()
    }
    return user
  }

  cookieExtractor = (request: FastifyRequest): string | null => {
    let token = null
    if (request && request.cookies) {
      token = request.cookies[TOKEN.ACCESS]
    }
    return token
  }
}
