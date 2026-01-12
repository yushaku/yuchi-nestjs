/* eslint-disable @typescript-eslint/no-var-requires */
import { PrismaClient } from '../../generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Database helper for e2e tests
 * Provides utilities to clean and seed test database
 */
export class DatabaseHelper {
  private prisma: PrismaClient

  constructor() {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL is not set. Make sure DATABASE_URL or DATABASE_URL_TEST is set in your test environment.',
      )
    }

    // Validate DATABASE_URL format (mask password for security)
    try {
      const url = new URL(databaseUrl)
      if (!url.hostname || !url.port || !url.pathname) {
        throw new Error('Invalid DATABASE_URL format')
      }
    } catch (error) {
      const maskedUrl = this.maskDatabaseUrl(databaseUrl)
      throw new Error(
        `Invalid DATABASE_URL format: ${maskedUrl}. ` +
          'Expected format: postgresql://user:password@host:port/database',
      )
    }

    // Use the same adapter pattern as PrismaService for consistency
    const adapter = new PrismaPg({
      connectionString: databaseUrl,
    })
    this.prisma = new PrismaClient({ adapter })
  }

  /**
   * Mask database URL password for error messages
   */
  private maskDatabaseUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      if (urlObj.password) {
        urlObj.password = '***'
      }
      return urlObj.toString()
    } catch {
      // If URL parsing fails, just mask the middle part
      const parts = url.split('@')
      if (parts.length === 2) {
        return parts[0].split(':')[0] + ':***@' + parts[1]
      }
      return url.replace(/:[^:@]+@/, ':***@')
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<void> {
    try {
      await this.prisma.$connect()
      await this.prisma.$queryRaw`SELECT 1`
    } catch (error: any) {
      const maskedUrl = this.maskDatabaseUrl(process.env.DATABASE_URL || '')
      throw new Error(
        `Failed to connect to database: ${error.message}. ` +
          `Check your DATABASE_URL credentials: ${maskedUrl}`,
      )
    }
  }

  /**
   * Clean all data from database (in correct order to respect foreign keys)
   */
  async cleanDatabase() {
    // Delete in order to respect foreign key constraints
    await this.prisma.userWordProgress.deleteMany()
    await this.prisma.quizQuestion.deleteMany()
    await this.prisma.vocabulary.deleteMany()
    await this.prisma.category.deleteMany()
    await this.prisma.learningGroup.deleteMany()
    await this.prisma.subscription.deleteMany()
    await this.prisma.subscriptionCode.deleteMany()
    await this.prisma.user.deleteMany()
  }

  /**
   * Create a test user
   */
  async createUser(data?: {
    email?: string
    password?: string
    name?: string
    role?: string
  }) {
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(
      data?.password || 'password123',
      10,
    )

    return this.prisma.user.create({
      data: {
        email: data?.email || `test-${Date.now()}@example.com`,
        password: hashedPassword,
        name: data?.name || 'Test User',
        role: (data?.role as any) || 'MEMBER',
      },
    })
  }

  /**
   * Create test vocabulary data
   */
  async createVocabularyData() {
    // Create a learning group
    const group = await this.prisma.learningGroup.create({
      data: {
        name: 'Test Group',
        icon: '📚',
        topikLevel: 1,
      },
    })

    // Create a category
    const category = await this.prisma.category.create({
      data: {
        name: 'Test Category',
        description: 'Test category description',
        icon: '📖',
        order: 1,
        topikLevel: 1,
        groupId: group.id,
      },
    })

    // Create vocabularies
    const vocabularies = await Promise.all([
      this.prisma.vocabulary.create({
        data: {
          korean: '안녕하세요',
          vietnamese: 'Xin chào',
          pronunciation: 'annyeonghaseyo',
          example: '안녕하세요, 만나서 반갑습니다.',
          exampleTranslation: 'Xin chào, rất vui được gặp bạn.',
          categoryId: category.id,
        },
      }),
      this.prisma.vocabulary.create({
        data: {
          korean: '감사합니다',
          vietnamese: 'Cảm ơn',
          pronunciation: 'gamsahamnida',
          example: '감사합니다, 도와주셔서.',
          exampleTranslation: 'Cảm ơn bạn đã giúp đỡ.',
          categoryId: category.id,
        },
      }),
      this.prisma.vocabulary.create({
        data: {
          korean: '죄송합니다',
          vietnamese: 'Xin lỗi',
          pronunciation: 'joesonghamnida',
          example: '죄송합니다, 늦었습니다.',
          exampleTranslation: 'Xin lỗi, tôi đã đến muộn.',
          categoryId: category.id,
        },
      }),
    ])

    return {
      group,
      category,
      vocabularies,
    }
  }

  /**
   * Create user word progress
   */
  async createUserWordProgress(
    userId: string,
    vocabId: string,
    data?: {
      reviewLevel?: number
      isIgnored?: boolean
      lastReviewed?: Date
      nextReview?: Date
      correctCount?: number
      totalAttempts?: number
    },
  ) {
    const now = new Date()
    return this.prisma.userWordProgress.create({
      data: {
        userId,
        vocabId,
        reviewLevel: data?.reviewLevel ?? 0,
        isIgnored: data?.isIgnored ?? false,
        lastReviewed: data?.lastReviewed ?? now,
        nextReview:
          data?.nextReview ?? new Date(now.getTime() + 24 * 60 * 60 * 1000),
        correctCount: data?.correctCount ?? 0,
        totalAttempts: data?.totalAttempts ?? 0,
      },
    })
  }

  /**
   * Get Prisma client instance
   */
  getPrisma() {
    return this.prisma
  }

  /**
   * Disconnect from database
   */
  async disconnect() {
    await this.prisma.$disconnect()
  }
}
