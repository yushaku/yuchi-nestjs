import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { FastifyReply } from 'fastify'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import {
  AuthResponseDto,
  GoogleIdTokenDto,
  LoginDto,
  RegisterDto,
} from './dto/auth.dto'
import { TOKEN } from '../shared/constant'
import { JWTService } from '../shared/jwt.service'

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private isDevelopment: boolean

  constructor(
    private authService: AuthService,
    private config: ConfigService,
    private jwt: JWTService,
  ) {
    this.isDevelopment =
      this.config.get('NODE_ENV') === 'development' ? true : false
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid email or password format' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(
      loginDto.email,
      loginDto.password,
    )
    this.setToken(res, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })
    return result
  }

  @Post('register')
  @HttpCode(201)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid email format or password requirements not met',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register({
      email: registerDto.email,
      password: registerDto.password,
      name: registerDto.name,
    })
    this.setToken(res, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })
    return result
  }

  @Post('google')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Google Token Exchange Flow - Authenticate with ID token',
    description:
      'Token Exchange Flow: Client sends Google ID token, server validates and exchanges for application JWT. Works for web, iOS, and Android. Client should send ID token from Google Sign-In SDK in request body as "idToken"',
  })
  @ApiBody({ type: GoogleIdTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid or missing ID token' })
  @ApiUnauthorizedResponse({ description: 'Invalid Google ID token' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async googleTokenExchange(
    @Body() googleIdTokenDto: GoogleIdTokenDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.googleAuthWithIdToken(
      googleIdTokenDto.idToken,
    )

    this.setToken(res, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })

    return result
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refresh_token: {
          type: 'string',
          description: 'Refresh token',
        },
      },
      required: ['refresh_token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid or missing refresh token' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  @ApiTooManyRequestsResponse({ description: 'Too many requests' })
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.refreshToken(refreshToken)
    const cookieOptions = this.jwt.option()

    // Set new access token cookie
    res.cookie(TOKEN.ACCESS, result.access_token, {
      ...cookieOptions,
      sameSite: (cookieOptions.sameSite as 'lax' | 'strict') || 'lax',
      secure: !this.isDevelopment,
    })

    return result
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  async logout(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie(TOKEN.ACCESS)
    res.clearCookie(TOKEN.REFRESH)
    return { message: 'Logged out successfully' }
  }

  private setToken(
    res: FastifyReply,
    {
      access_token,
      refresh_token,
    }: { access_token: string; refresh_token: string },
  ) {
    res.cookie(TOKEN.ACCESS, access_token, {
      httpOnly: true,
      sameSite: (this.isDevelopment ? 'lax' : 'strict') as 'lax' | 'strict',
      secure: !this.isDevelopment,
      path: '/',
    })
    res.cookie(TOKEN.REFRESH, refresh_token, {
      httpOnly: true,
      sameSite: (this.isDevelopment ? 'lax' : 'strict') as 'lax' | 'strict',
      secure: !this.isDevelopment,
      path: '/',
    })
  }
}
