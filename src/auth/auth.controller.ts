import { TOKEN } from '@/shared/constant'
import { GoogleOAuthGuard } from '@/shared/guard'
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
import { ConfigService } from '@nestjs/config'
import { ThrottlerGuard } from '@nestjs/throttler'
import { FastifyReply, FastifyRequest } from 'fastify'
import { AuthService } from './auth.service'
import { CreateUserDto, UserDto } from './dto/user.dto'
import { ApiTags } from '@nestjs/swagger'

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private isDevelopment: boolean

  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {
    this.isDevelopment =
      this.config.get('NODE_ENV') === 'development' ? true : false
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  googleLogin() {
    return
  }

  @Get('google/redirect')
  @UseGuards(GoogleOAuthGuard)
  async googleAuthRedirect(
    @Req() req: FastifyRequest & { user: CreateUserDto },
    @Res() res: FastifyReply,
  ) {
    const user = req.user as CreateUserDto
    const token = await this.authService.googleAuth(user)

    this.setToken(res, token)
    res.redirect(this.config.get('CLIENT_URL') ?? 'http://localhost:3000')
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() userDto: UserDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const token = await this.authService.login(userDto)
    this.setToken(res, token)
    res
      .status(200)
      .send({ message: 'Auth Successfully', access_token: token.access_token })
  }

  @Post('register')
  async register(@Body() userDto: CreateUserDto) {
    await this.authService.register(userDto)
    return { message: 'please confirm your email' }
  }

  @Post('logout')
  @HttpCode(200)
  async logOut(@Res({ passthrough: true }) res: FastifyReply) {
    res.clearCookie(TOKEN.ACCESS)
    res.clearCookie(TOKEN.REFRESH)
  }

  @Get('verify')
  async verifyEmail(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const tk = await this.authService.verifyEmail(token)
    this.setToken(res, tk)
    res.redirect(process.env.CLIENT_URL ?? 'http://localhost:3000/', 301)
  }

  protected setToken(res: FastifyReply, { access_token, refresh_token }) {
    res.cookie(TOKEN.ACCESS, access_token, {
      httpOnly: true,
      sameSite: this.isDevelopment ? 'lax' : 'strict',
      secure: this.isDevelopment ? false : true,
      path: '/',
    })
    res.cookie(TOKEN.REFRESH, refresh_token, {
      httpOnly: true,
      sameSite: this.isDevelopment ? 'lax' : 'strict',
      secure: this.isDevelopment ? false : true,
      path: '/',
    })
  }
}
