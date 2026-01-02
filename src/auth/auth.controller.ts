import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { FastifyReply, FastifyRequest } from 'fastify'
import { ThrottlerGuard } from '@nestjs/throttler'
import { AuthService } from './auth.service'
import { GoogleOAuthGuard } from '../shared/guard/google.guard'
import {
  AuthResponseDto,
  GoogleAuthDto,
  Platform,
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

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth for web' })
  googleLogin() {
    // Passport handles the redirect
  }

  @Get('google/mobile')
  @ApiOperation({ summary: 'Get Google OAuth URL for mobile apps' })
  async getGoogleAuthUrl(@Query() query: GoogleAuthDto) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID')
    const redirectUri = this.getMobileRedirectUri(
      query.platform,
      query.deepLinkScheme,
    )
    const scope = 'email profile'
    const responseType = 'code'
    const accessType = 'offline'
    const prompt = 'consent'

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=${responseType}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=${accessType}&` +
      `prompt=${prompt}`

    return { authUrl, redirectUri }
  }

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback for web' })
  async googleAuthRedirect(
    @Req()
    req: FastifyRequest & {
      user: { email: string; name: string; password: string }
    },
    @Res() res: FastifyReply,
  ) {
    const user = req.user
    const result = await this.authService.googleAuth(user)

    // Set cookies for web
    this.setToken(res, {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
    })

    const clientUrl = this.config.get('CLIENT_URL') || 'http://localhost:3000'
    res.redirect(
      `${clientUrl}?token=${result.access_token}&refresh=${result.refresh_token}`,
    )
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback for mobile apps' })
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('platform') platform: Platform,
    @Query('deepLinkScheme') deepLinkScheme?: string,
  ) {
    if (!code) {
      throw new Error('Authorization code is missing')
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(
      code,
      platform,
      deepLinkScheme,
    )

    // Get user info from Google
    const userInfo = await this.getUserInfoFromGoogle(tokens.access_token)

    // Authenticate user
    const result = await this.authService.googleAuth({
      email: userInfo.email,
      name: `${userInfo.given_name} ${userInfo.family_name}`,
      password: `google-${userInfo.id}`,
    })

    // Return tokens for mobile app to handle
    return {
      ...result,
      deepLink: this.createDeepLink(result, platform, deepLinkScheme),
    }
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(
    @Body('refresh_token') refreshToken: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.authService.refreshToken(refreshToken)
    const cookieOptions = this.jwt.option()
    res.cookie(TOKEN.ACCESS, result.access_token, {
      ...cookieOptions,
      sameSite: (cookieOptions.sameSite as 'lax' | 'strict') || 'lax',
    })
    return result
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Logout user' })
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

  private getMobileRedirectUri(
    platform: Platform,
    deepLinkScheme?: string,
  ): string {
    const baseUrl =
      this.config.get('API_URL') ||
      `http://localhost:${this.config.get('APP_PORT')}`

    if (platform === Platform.IOS && deepLinkScheme) {
      // For iOS, use custom URL scheme
      return `${deepLinkScheme}auth/callback`
    } else if (platform === Platform.ANDROID && deepLinkScheme) {
      // For Android, use app link or custom scheme
      return `${deepLinkScheme}auth/callback`
    }

    // Fallback to HTTP callback
    return `${baseUrl}/auth/google/callback`
  }

  private createDeepLink(
    result: AuthResponseDto,
    platform: Platform,
    deepLinkScheme?: string,
  ): string {
    if (!deepLinkScheme) {
      return null
    }

    const tokens = `access_token=${result.access_token}&refresh_token=${result.refresh_token}`
    return `${deepLinkScheme}auth/success?${tokens}`
  }

  private async exchangeCodeForTokens(
    code: string,
    platform: Platform,
    deepLinkScheme?: string,
  ): Promise<{ access_token: string; refresh_token?: string }> {
    const clientId = this.config.get('GOOGLE_CLIENT_ID')
    const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = this.getMobileRedirectUri(platform, deepLinkScheme)

    const https = await import('https')
    const querystring = await import('querystring')

    const postData = querystring.stringify({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })

    const response = await new Promise<{
      access_token: string
      refresh_token?: string
    }>((resolve, reject) => {
      const req = https.request(
        'https://oauth2.googleapis.com/token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data))
            } else {
              reject(new Error(`Failed to exchange code: ${data}`))
            }
          })
        },
      )
      req.on('error', reject)
      req.write(postData)
      req.end()
    })

    return response
  }

  private async getUserInfoFromGoogle(accessToken: string): Promise<{
    id: string
    email: string
    given_name: string
    family_name: string
  }> {
    const https = await import('https')

    const response = await new Promise<{
      id: string
      email: string
      given_name: string
      family_name: string
    }>((resolve, reject) => {
      const req = https.request(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        (res) => {
          let data = ''
          res.on('data', (chunk) => {
            data += chunk
          })
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data))
            } else {
              reject(new Error(`Failed to get user info: ${data}`))
            }
          })
        },
      )
      req.on('error', reject)
      req.end()
    })

    return response
  }
}
