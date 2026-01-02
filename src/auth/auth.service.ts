import { PrismaService } from '@/prisma.service'
import { QUEUE_LIST } from '@/shared/constant'
import { JWTService } from '@/shared/jwt.service'
import { InjectQueue } from '@nestjs/bullmq'
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import bcrypt from 'bcryptjs'
import { Queue } from 'bullmq'
import { DateTime } from 'luxon'
import { CreateUserDto, UserDto } from './dto/user.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JWTService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    @InjectQueue(QUEUE_LIST.AUTH) private queue: Queue,
  ) {}

  async login({ email, password }: UserDto) {
    const failedjail = await this.getJail(email)

    if (failedjail?.expired > DateTime.now().second) {
      throw new BadRequestException(
        'Your account has been locked, please try again later',
      )
    }

    if (failedjail?.retry > 5) {
      throw new BadRequestException(
        'Your account has been locked, please reset your password',
      )
    }

    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) throw new NotFoundException("User's email does not exist")

    const isMatching = await bcrypt.compare(password, user.password)
    if (!isMatching) {
      await this.setjail(email, failedjail)
      throw new UnauthorizedException('Wrong credentials')
    }

    await this.removeJail(email)
    const { access_token, refresh_token } = this.jwt.genToken({
      userId: user.id,
    })

    return { access_token, refresh_token }
  }

  async register(userDto: CreateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: userDto.email },
    })
    if (user) throw new BadRequestException("email's user already existed")

    const token = this.jwt.emailToken(userDto)
    await this.queue.add('SEND_VERIFY_EMAIL', { ...userDto, token })
  }

  async googleAuth(user: CreateUserDto) {
    const existedUser = await this.prisma.user.findUnique({
      where: { email: user.email },
    })
    if (!existedUser) return this.createAccount(user)

    const { access_token, refresh_token } = this.jwt.genToken({
      userId: existedUser.id,
    })

    return { access_token, refresh_token }
  }

  async verifyEmail(token: string) {
    const {
      email,
      password,
      name = '',
    } = await this.jwt.verifyEmailToken(token)

    const existedUser = await this.prisma.user.findUnique({ where: { email } })
    if (existedUser) return { access_token: '', refresh_token: '' }

    const { access_token, refresh_token } = await this.createAccount({
      email,
      name,
      password,
    })

    return {
      access_token,
      refresh_token,
    }
  }

  async createAccount(userDto: CreateUserDto) {
    const saltRounds = 10

    const existedUser = await this.prisma.user.findUnique({
      where: { email: userDto.email },
    })
    if (existedUser)
      throw new BadRequestException("email's user already existed")

    const hash: string = await bcrypt.hash(userDto.password, saltRounds)

    const user = await this.prisma.user.create({
      data: {
        name: userDto.name,
        email: userDto.email,
        password: hash,
      },
    })

    const { access_token, refresh_token } = this.jwt.genToken({
      userId: user.id,
    })

    return { access_token, refresh_token }
  }

  async getJail(email: string) {
    const failedjail: null | JailUser = await this.cache.get(
      `jail-user-${email}`,
    )
    return failedjail
  }

  async removeJail(email: string) {
    await this.cache.del(`jail-user-${email}`)
  }

  async setjail(email: string, failedjail: null | JailUser) {
    const time = Number(failedjail?.retry ?? 0) + 1
    const lockTime = this.lockTime(time)
    const expired = DateTime.now().plus({ minutes: lockTime }).toSeconds()

    await this.cache.set(
      `jail-user-${email}`,
      {
        retry: time,
        lock: `${lockTime} mins`,
        expired,
      },
      24 * 60 * 60 * 1000,
    )
  }

  lockTime(time: number): number {
    switch (time) {
      case 1:
        return 0
      case 2:
        return 0
      case 3:
        return 0
      case 4:
        return 5
      case 5:
        return 15
      default:
        return 60
    }
  }
}

type JailUser = { retry: number; lock: string; expired: number }
