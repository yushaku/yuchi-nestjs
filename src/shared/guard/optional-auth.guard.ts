import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { FastifyRequest } from 'fastify'
import { ExtractJwt } from 'passport-jwt'

import { TOKEN } from '@/shared/constant'
import { JWTService } from '@/shared/jwt.service'

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
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

      // If no token, allow request to proceed as anonymous
      if (!accessToken) {
        return true
      }

      // Validate token
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
              request.headers.authorization = `Bearer ${newToken}`
              validatedUser = await this.authService.validateToken(newToken)
            }
          } catch (refreshError) {
            // Refresh failed, treat as anonymous
          }
        }
      }

      if (validatedUser) {
        request.user = validatedUser
      } else {
        // Token invalid and refresh failed -> Clear cookies but allow anonymous
        response.clearCookie(TOKEN.ACCESS)
        response.clearCookie(TOKEN.REFRESH)
      }

      return true
    } catch (error) {
      // On any error, allow to proceed as anonymous
      return true
    }
  }

  private getTokenFromHeader(request: FastifyRequest): string | null {
    const authorization = request.headers.authorization || ''
    if (authorization.startsWith('Bearer ')) {
      return authorization.replace('Bearer ', '')
    }
    return null
  }

  cookieExtractor = (request: FastifyRequest): string | null => {
    let token = null
    if (request && request.cookies) {
      token = request.cookies[TOKEN.ACCESS]
    }
    return token
  }
}
