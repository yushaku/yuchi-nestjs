import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'

import { PrismaService } from '@/shared/prisma.service'
import {
  SearchUsersDto,
  UpdateUserRoleDto,
  UsersListResponseDto,
  UserResponseDto,
  Role,
  CreateUserDto,
} from './dto/user.dto'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(dto: CreateUserDto): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    })

    if (existingUser) {
      throw new BadRequestException('User with this email already exists')
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name || null,
        role: dto.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return user as UserResponseDto
  }

  async userInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user
  }

  async searchUsers(dto: SearchUsersDto): Promise<UsersListResponseDto> {
    const { query, role, skip, perPage, page } = dto

    // Build where clause
    const where: any = {}

    if (role) {
      where.role = role
    }

    if (query) {
      where.OR = [
        { email: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await this.prisma.user.count({ where })

    // Get users with pagination
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { email: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    const totalPages = Math.ceil(total / perPage)

    return {
      users: users as UserResponseDto[],
      total,
      page,
      perPage,
      totalPages,
    }
  }

  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDto,
  ): Promise<UserResponseDto> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Validate role
    if (!Object.values(Role).includes(dto.role)) {
      throw new BadRequestException('Invalid role')
    }

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return updatedUser as UserResponseDto
  }
}
