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
import { SubStatus } from '../../generated/prisma/client'
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
    if (!user) throw new NotFoundException('User not found')

    // Get current active subscription
    const now = new Date()
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubStatus.ACTIVE,
        OR: [
          { endDate: null }, // Lifetime subscription
          { endDate: { gt: now } }, // Subscription not expired yet
        ],
      },
      orderBy: {
        startDate: 'desc',
      },
      select: {
        id: true,
        planType: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    })

    const result = {
      id: user.id,
      email: user.email,
      name: user.name,
      subscription: activeSubscription
        ? {
            planType: activeSubscription.planType,
            status: activeSubscription.status,
            startDate: activeSubscription.startDate,
            endDate: activeSubscription.endDate,
          }
        : null,
    }

    return result
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

  /**
   * Get user summary statistics for word progress
   * Returns total, total_word_active, total_word_inactive, review_count, and statistics by proficiency
   */
  async getUserSummary(userId: string) {
    // Get all user's word progress records for statistics
    const allProgressRecords = await this.prisma.userWordProgress.findMany({
      where: { userId },
      select: {
        reviewLevel: true,
        isIgnored: true,
        totalAttempts: true,
        correctCount: true,
      },
    })

    // Calculate totals
    const total = allProgressRecords.length
    const total_word_active = allProgressRecords.filter(
      (p) => !p.isIgnored,
    ).length
    const total_word_inactive = allProgressRecords.filter(
      (p) => p.isIgnored,
    ).length
    const review_count = allProgressRecords.filter(
      (p) => p.totalAttempts > 0,
    ).length

    // Calculate statistics by proficiency level
    // reviewLevel is the proficiency level
    const proficiencyMap = new Map<number, number>()

    // Initialize all proficiency levels 0-9 with count 0
    for (let i = 0; i <= 9; i++) {
      proficiencyMap.set(i, 0)
    }

    // Count words by proficiency level (reviewLevel is the proficiency)
    allProgressRecords.forEach((record) => {
      const proficiency = record.reviewLevel
      proficiencyMap.set(
        proficiency,
        (proficiencyMap.get(proficiency) || 0) + 1,
      )
    })

    // Convert to array format
    const statistic = Array.from(proficiencyMap.entries())
      .map(([proficiency, count]) => ({
        proficiency,
        count,
      }))
      .sort((a, b) => a.proficiency - b.proficiency)

    return {
      total,
      total_word_active,
      total_word_inactive,
      review_count,
      statistic,
    }
  }
}
