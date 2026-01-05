import {
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common'
import { JwtAuthGuard } from './auth.guard'
import { JwtDecoded } from '../decorators/JwtUser.decorator'
import { JWTService } from '../jwt.service'

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  constructor(authService: JWTService) {
    super(authService)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check authentication
    const isAuthenticated = await super.canActivate(context)
    if (!isAuthenticated) {
      return false
    }

    // Then check role
    const request = context.switchToHttp().getRequest()
    const user = request.user as JwtDecoded

    if (user?.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can access this resource')
    }

    return true
  }
}

@Injectable()
export class SaleGuard extends JwtAuthGuard {
  constructor(authService: JWTService) {
    super(authService)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check authentication
    const isAuthenticated = await super.canActivate(context)
    if (!isAuthenticated) {
      return false
    }

    // Then check role
    const request = context.switchToHttp().getRequest()
    const user = request.user as JwtDecoded

    if (user?.role !== 'SALE') {
      throw new ForbiddenException('Only sale staff can access this resource')
    }

    return true
  }
}

@Injectable()
export class AdminOrSaleGuard extends JwtAuthGuard {
  constructor(authService: JWTService) {
    super(authService)
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check authentication
    const isAuthenticated = await super.canActivate(context)
    if (!isAuthenticated) {
      return false
    }

    // Then check role
    const request = context.switchToHttp().getRequest()
    const user = request.user as JwtDecoded

    if (user?.role !== 'ADMIN' && user?.role !== 'SALE') {
      throw new ForbiddenException(
        'Only admin or sale staff can access this resource',
      )
    }

    return true
  }
}
