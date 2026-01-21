import { Test, TestingModule } from '@nestjs/testing'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { DatabaseHelper } from './helpers/database.helper'
import { AuthHelper } from './helpers/auth.helper'

describe('Learning premium access (e2e)', () => {
  let app: NestFastifyApplication
  let dbHelper: DatabaseHelper
  let authHelper: AuthHelper

  let freeCategory: any
  let freeVocab: any
  let premiumCategory: any
  let premiumVocab: any
  let memberUser: any
  let adminUser: any

  beforeAll(async () => {
    dbHelper = new DatabaseHelper()
    authHelper = new AuthHelper()

    await dbHelper.testConnection()
    await dbHelper.cleanDatabase()

    // Create users
    memberUser = await dbHelper.createUser({
      email: 'member-premium@example.com',
      name: 'Member User',
      role: 'MEMBER',
    })
    adminUser = await dbHelper.createUser({
      email: 'admin-premium@example.com',
      name: 'Admin User',
      role: 'ADMIN',
    })

    const prisma = dbHelper.getPrisma()

    // Create group
    const group = await prisma.learningGroup.create({
      data: {
        name: 'Premium Test Group',
        icon: '⭐',
        topikLevel: 1,
      },
    })

    // Free category (isNeedPremium = false)
    freeCategory = await prisma.category.create({
      data: {
        name: 'Free Category',
        description: 'Free vocab',
        icon: '🆓',
        order: 1,
        topikLevel: 1,
        groupId: group.id,
        isNeedPremium: false,
      },
    })

    freeVocab = await prisma.vocabulary.create({
      data: {
        korean: '안녕',
        vietnamese: 'Xin chào',
        pronunciation: 'annyeong',
        categoryId: freeCategory.id,
      },
    })

    // Premium category (isNeedPremium = true)
    premiumCategory = await prisma.category.create({
      data: {
        name: 'Premium Category',
        description: 'Premium vocab',
        icon: '💎',
        order: 2,
        topikLevel: 1,
        groupId: group.id,
        isNeedPremium: true,
      },
    })

    premiumVocab = await prisma.vocabulary.create({
      data: {
        korean: '감사합니다',
        vietnamese: 'Cảm ơn',
        pronunciation: 'gamsahamnida',
        categoryId: premiumCategory.id,
      },
    })

    // Attach a quiz to premium vocab so quiz endpoint is meaningful
    await prisma.quizQuestion.create({
      data: {
        question: '감사합니다 means?',
        options: ['Thank you', 'Hello'],
        correctAnswer: 'Thank you',
        VocabularyId: premiumVocab.id,
      },
    })

    // Create an active subscription for memberUser
    const now = new Date()
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    await prisma.subscription.create({
      data: {
        userId: memberUser.id,
        planType: 'MONTHLY',
        status: 'ACTIVE',
        source: 'CODE',
        startDate: now,
        endDate: future,
      },
    })

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    const adapter = new FastifyAdapter({ logger: false })
    app = moduleFixture.createNestApplication<NestFastifyApplication>(adapter)

    const instance = app.getHttpAdapter().getInstance()
    instance.addHook('onRequest', (request: any, reply: any, done: any) => {
      if (!reply.setHeader) {
        reply.setHeader = function (name: string, value: string) {
          reply.header(name, value)
          return this
        }
      }
      if (!reply.end) {
        reply.end = function (chunk?: any, encoding?: any) {
          if (chunk) {
            reply.send(chunk)
          } else {
            reply.send()
          }
          return this
        }
      }
      done()
    })

    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    if (dbHelper) {
      await dbHelper.cleanDatabase()
      await dbHelper.disconnect()
    }
    if (app) {
      await app.close()
    }
  })

  describe('GET /learning/categories/:categoryId/vocabularies', () => {
    it('allows anonymous access for free category', async () => {
      await request(app.getHttpServer())
        .get(`/learning/categories/${freeCategory.id}/vocabularies`)
        .expect(200)
    })

    it('returns 401 for anonymous access to premium category', async () => {
      await request(app.getHttpServer())
        .get(`/learning/categories/${premiumCategory.id}/vocabularies`)
        .expect(401)
    })

    it('returns 403 for logged-in user without active subscription', async () => {
      const otherUser = await dbHelper.createUser({
        email: 'no-sub@example.com',
        name: 'No Sub',
      })

      await request(app.getHttpServer())
        .get(`/learning/categories/${premiumCategory.id}/vocabularies`)
        .set('Authorization', authHelper.getAuthHeader(otherUser.id))
        .expect(403)
    })

    it('returns 200 for logged-in user with active subscription', async () => {
      await request(app.getHttpServer())
        .get(`/learning/categories/${premiumCategory.id}/vocabularies`)
        .set('Authorization', authHelper.getAuthHeader(memberUser.id))
        .expect(200)
    })

    it('allows admin to bypass subscription check', async () => {
      await request(app.getHttpServer())
        .get(`/learning/categories/${premiumCategory.id}/vocabularies`)
        .set('Authorization', authHelper.getAuthHeader(adminUser.id, 'ADMIN'))
        .expect(200)
    })
  })

  describe('GET /learning/vocabularies/:vocabId/quiz-questions', () => {
    it('allows anonymous access for quiz of free vocab', async () => {
      // Ensure there is at least one quiz for free vocab for this assertion
      const prisma = dbHelper.getPrisma()
      await prisma.quizQuestion.create({
        data: {
          question: '안녕 means?',
          options: ['Hi', 'Bye'],
          correctAnswer: 'Hi',
          VocabularyId: freeVocab.id,
        },
      })

      await request(app.getHttpServer())
        .get(`/learning/vocabularies/${freeVocab.id}/quiz-questions`)
        .expect(200)
    })

    it('returns 401 for anonymous access to quiz of premium vocab', async () => {
      await request(app.getHttpServer())
        .get(`/learning/vocabularies/${premiumVocab.id}/quiz-questions`)
        .expect(401)
    })

    it('returns 403 for logged-in user without active subscription', async () => {
      const otherUser = await dbHelper.createUser({
        email: 'no-sub-quiz@example.com',
        name: 'No Sub Quiz',
      })

      await request(app.getHttpServer())
        .get(`/learning/vocabularies/${premiumVocab.id}/quiz-questions`)
        .set('Authorization', authHelper.getAuthHeader(otherUser.id))
        .expect(403)
    })

    it('returns 200 for logged-in user with active subscription', async () => {
      await request(app.getHttpServer())
        .get(`/learning/vocabularies/${premiumVocab.id}/quiz-questions`)
        .set('Authorization', authHelper.getAuthHeader(memberUser.id))
        .expect(200)
    })

    it('allows admin to bypass subscription check for quiz', async () => {
      await request(app.getHttpServer())
        .get(`/learning/vocabularies/${premiumVocab.id}/quiz-questions`)
        .set('Authorization', authHelper.getAuthHeader(adminUser.id, 'ADMIN'))
        .expect(200)
    })
  })
})
