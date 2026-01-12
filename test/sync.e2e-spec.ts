import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify'
import request from 'supertest'
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

    // Test database connection first
    await dbHelper.testConnection()

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
    if (dbHelper) {
      await dbHelper.cleanDatabase()
      await dbHelper.disconnect()
    }
    if (app) {
      await app.close()
    }
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
        .expect(201)

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
        .expect(201)

      expect(response.body.data).toHaveProperty('success', true)
      expect(response.body.data).toHaveProperty('syncedCount', 1) // Only valid one
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
        .expect(201)

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
