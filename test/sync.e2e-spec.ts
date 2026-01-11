import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { DatabaseHelper } from './helpers/database.helper'
import { AuthHelper } from './helpers/auth.helper'

describe('SyncController (e2e)', () => {
  let app: NestFastifyApplication
  let dbHelper: DatabaseHelper
  let authHelper: AuthHelper
  let testUser: any
  let testVocabularies: any[]

  beforeAll(async () => {
    // Initialize helpers
    dbHelper = new DatabaseHelper()
    authHelper = new AuthHelper()

    // Clean database before tests
    await dbHelper.cleanDatabase()

    // Create test user
    testUser = await dbHelper.createUser({
      email: 'sync-test@example.com',
      password: 'password123',
      name: 'Sync Test User',
    })

    // Create test vocabulary data
    const vocabData = await dbHelper.createVocabularyData()
    testVocabularies = vocabData.vocabularies

    // Create NestJS testing module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    // Use FastifyAdapter for testing (same as production)
    const adapter = new FastifyAdapter({
      logger: false,
    })
    app = moduleFixture.createNestApplication<NestFastifyApplication>(adapter)

    // Register Fastify adapter hooks (similar to main.ts)
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
    // Clean database after tests
    await dbHelper.cleanDatabase()
    await dbHelper.disconnect()
    await app.close()
  })

  describe('POST /sync/push', () => {
    it('should successfully push word progress data', async () => {
      const now = Date.now()
      const tomorrow = now + 24 * 60 * 60 * 1000

      const wordProgresses = [
        {
          vocabId: testVocabularies[0].id,
          reviewLevel: 2,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 5,
          totalAttempts: 7,
        },
        {
          vocabId: testVocabularies[1].id,
          reviewLevel: 1,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 3,
          totalAttempts: 4,
        },
      ]

      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .send({ wordProgresses })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('syncedCount', 2)
      expect(response.body.data).toHaveProperty('syncedAt')
      expect(typeof response.body.data.syncedAt).toBe('number')
    })

    it('should filter out invalid vocabIds', async () => {
      const now = Date.now()
      const tomorrow = now + 24 * 60 * 60 * 1000

      const wordProgresses = [
        {
          vocabId: testVocabularies[0].id, // Valid
          reviewLevel: 2,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 5,
          totalAttempts: 7,
        },
        {
          vocabId: '00000000-0000-0000-0000-000000000000', // Invalid UUID
          reviewLevel: 1,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 3,
          totalAttempts: 4,
        },
      ]

      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .send({ wordProgresses })
        .expect(200)

      expect(response.body.data).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('syncedCount', 1) // Only valid one
    })

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .send({ wordProgresses: [] })
        .expect(401)
    })

    it('should validate request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/sync/push')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .send({ wordProgresses: [] }) // Empty array should fail validation
        .expect(400)
    })
  })

  describe('GET /sync/pull', () => {
    beforeEach(async () => {
      // Create some word progress data for pull tests
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await dbHelper.createUserWordProgress(
        testUser.id,
        testVocabularies[0].id,
        {
          reviewLevel: 2,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 5,
          totalAttempts: 7,
        },
      )

      await dbHelper.createUserWordProgress(
        testUser.id,
        testVocabularies[1].id,
        {
          reviewLevel: 1,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 3,
          totalAttempts: 4,
        },
      )
    })

    it('should pull all word progress data when lastSyncTime is null', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/pull')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .query({ lastSyncTime: null })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('data')
      expect(response.body.data).toHaveProperty('page', 1)
      expect(response.body.data).toHaveProperty('limit', 50)
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('totalPages')
      expect(response.body.data).toHaveProperty('hasMore')
      expect(Array.isArray(response.body.data.data)).toBe(true)
      expect(response.body.data.data.length).toBeGreaterThan(0)

      // Check data format
      if (response.body.data.data.length > 0) {
        const item = response.body.data.data[0]
        expect(item).toHaveProperty('userId')
        expect(item).toHaveProperty('vocabId')
        expect(item).toHaveProperty('reviewLevel')
        expect(item).toHaveProperty('isIgnored')
        expect(item).toHaveProperty('lastReviewed')
        expect(item).toHaveProperty('nextReview')
        expect(item).toHaveProperty('correctCount')
        expect(item).toHaveProperty('totalAttempts')
        expect(typeof item.lastReviewed).toBe('number')
        expect(typeof item.nextReview).toBe('number')
      }
    })

    it('should pull only updated data when lastSyncTime is provided', async () => {
      const lastSyncTime = Date.now() - 1000 // 1 second ago

      const response = await request(app.getHttpServer())
        .get('/sync/pull')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .query({ lastSyncTime })
        .expect(200)

      expect(response.body).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('data')
      expect(Array.isArray(response.body.data.data)).toBe(true)
    })

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/pull')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .query({ page: 1, limit: 1 })
        .expect(200)

      expect(response.body.data).toHaveProperty('page', 1)
      expect(response.body.data).toHaveProperty('limit', 1)
      expect(response.body.data.data.length).toBeLessThanOrEqual(1)
    })

    it('should require authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/sync/pull')
        .query({ lastSyncTime: null })
        .expect(401)
    })
  })

  describe('Integration: Push and Pull', () => {
    it('should push data and then pull it back', async () => {
      const now = Date.now()
      const tomorrow = now + 24 * 60 * 60 * 1000

      // Push data
      const pushData = [
        {
          vocabId: testVocabularies[2].id,
          reviewLevel: 3,
          isIgnored: false,
          lastReviewed: now,
          nextReview: tomorrow,
          correctCount: 8,
          totalAttempts: 10,
        },
      ]

      await request(app.getHttpServer())
        .post('/sync/push')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .send({ wordProgresses: pushData })
        .expect(200)

      // Pull data and verify it was saved
      const pullResponse = await request(app.getHttpServer())
        .get('/sync/pull')
        .set('Authorization', authHelper.getAuthHeader(testUser.id))
        .query({ lastSyncTime: null })
        .expect(200)

      const found = pullResponse.body.data.data.find(
        (item: any) => item.vocabId === testVocabularies[2].id,
      )

      expect(found).toBeDefined()
      expect(found.reviewLevel).toBe(3)
      expect(found.correctCount).toBe(8)
      expect(found.totalAttempts).toBe(10)
    })
  })
})
