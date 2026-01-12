import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const response = context.switchToHttp().getResponse()
    
    // Fastify request structure - handle both raw and wrapped requests
    const rawRequest = request.raw || request
    const method = rawRequest.method || request.method
    const url = rawRequest.url || request.url
    const query = rawRequest.query || request.query || {}
    const queryString = Object.keys(query).length > 0 ? `?${new URLSearchParams(query).toString()}` : ''
    const fullUrl = `${url}${queryString}`
    
    // Get IP address (check x-forwarded-for for proxied requests)
    const forwardedFor = rawRequest.headers?.['x-forwarded-for'] || request.headers?.['x-forwarded-for']
    const ip = forwardedFor 
      ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim())
      : rawRequest.ip || request.ip || rawRequest.socket?.remoteAddress || 'unknown'
    
    const userAgent = rawRequest.headers?.['user-agent'] || request.headers?.['user-agent'] || ''
    const startTime = Date.now()

    // Extract user ID if authenticated
    const userId = request.user?.id || null

    // Log request
    this.logger.log(
      `→ ${method} ${fullUrl} - IP: ${ip} - UserAgent: ${userAgent}${userId ? ` - UserId: ${userId}` : ''}`,
    )

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime
          const rawResponse = response.raw || response
          const statusCode = rawResponse.statusCode || response.statusCode || 200

          // Log response
          this.logger.log(
            `← ${method} ${fullUrl} - Status: ${statusCode} - ${responseTime}ms`,
          )
        },
        error: (error) => {
          const responseTime = Date.now() - startTime
          const statusCode = error.status || error.statusCode || 500

          // Log error response
          this.logger.error(
            `← ${method} ${fullUrl} - Status: ${statusCode} - ${responseTime}ms - Error: ${error.message}`,
            error.stack,
          )
        },
      }),
    )
  }
}
