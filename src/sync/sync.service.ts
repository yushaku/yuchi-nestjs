import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/prisma.service'
import {
  WordProgressSyncItemDto,
  PushWordProgressDto,
  PushWordProgressResponseDto,
  PullWordProgressDto,
} from './dto/sync.dto'

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  /**
   * PUSH: Receive pending sync data from mobile app
   * Mobile app sends data from pending_sync_ids table
   */
  async pushWordProgress(
    userId: string,
    dto: PushWordProgressDto,
  ): Promise<PushWordProgressResponseDto> {
    const syncedAt = Date.now()

    // Step 1: Validate and filter valid vocabularies
    const validWordProgresses = await this.filterValidWordProgresses(
      dto.wordProgresses,
    )

    if (validWordProgresses.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        syncedAt,
      }
    }

    // Step 2: Get existing progress records
    const existingProgressMap = await this.getExistingProgressMap(
      userId,
      validWordProgresses,
    )

    // Step 3: Categorize records into creates and updates
    const { toCreate, toUpdate } = this.categorizeProgressRecords(
      validWordProgresses,
      existingProgressMap,
    )

    // Step 4: Execute batch operations in transaction
    await this.prisma.$transaction(async (tx) => {
      // Batch create new records
      if (toCreate.length > 0) {
        await tx.userWordProgress.createMany({
          data: toCreate.map((wp) => ({
            userId,
            vocabId: wp.vocabId,
            reviewLevel: wp.reviewLevel,
            isIgnored: wp.isIgnored,
            lastReviewed: new Date(wp.lastReviewed),
            nextReview: new Date(wp.nextReview),
            correctCount: wp.correctCount,
            totalAttempts: wp.totalAttempts,
          })),
          skipDuplicates: true,
        })
      }

      // Batch update existing records
      // Note: Prisma doesn't support updateMany with different data per row,
      // so we use Promise.all for parallel updates within transaction
      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((wp) =>
            tx.userWordProgress.update({
              where: {
                userId_vocabId: {
                  userId,
                  vocabId: wp.vocabId,
                },
              },
              data: {
                reviewLevel: wp.reviewLevel,
                isIgnored: wp.isIgnored,
                lastReviewed: new Date(wp.lastReviewed),
                nextReview: new Date(wp.nextReview),
                correctCount: wp.correctCount,
                totalAttempts: wp.totalAttempts,
              },
            }),
          ),
        )
      }
    })

    return {
      success: true,
      syncedCount: validWordProgresses.length,
      syncedAt,
    }
  }

  /**
   * Validates vocabulary IDs and returns only valid word progresses
   */
  private async filterValidWordProgresses(
    wordProgresses: WordProgressSyncItemDto[],
  ): Promise<WordProgressSyncItemDto[]> {
    const vocabIds = [...new Set(wordProgresses.map((wp) => wp.vocabId))]

    const validVocabs = await this.prisma.vocabulary.findMany({
      where: { id: { in: vocabIds } },
      select: { id: true },
    })

    const validVocabSet = new Set(validVocabs.map((v) => v.id))

    return wordProgresses.filter((wp) => validVocabSet.has(wp.vocabId))
  }

  /**
   * Fetches existing progress records and returns as a Map for O(1) lookup
   */
  private async getExistingProgressMap(
    userId: string,
    wordProgresses: WordProgressSyncItemDto[],
  ): Promise<
    Map<string, { vocabId: string; lastReviewed: Date; reviewLevel: number }>
  > {
    const vocabIds = wordProgresses.map((wp) => wp.vocabId)

    const existingProgresses = await this.prisma.userWordProgress.findMany({
      where: {
        userId,
        vocabId: { in: vocabIds },
      },
      select: {
        vocabId: true,
        lastReviewed: true,
        reviewLevel: true,
      },
    })

    return new Map(existingProgresses.map((ep) => [ep.vocabId, ep]))
  }

  /**
   * Separates word progresses into creates and updates based on existing records
   * Only updates when:
   * - new lastReviewed > existing lastReviewed AND
   * - new reviewLevel >= existing reviewLevel (prevent downgrading review level)
   */
  private categorizeProgressRecords(
    wordProgresses: WordProgressSyncItemDto[],
    existingProgressMap: Map<
      string,
      { vocabId: string; lastReviewed: Date; reviewLevel: number }
    >,
  ) {
    const toCreate: WordProgressSyncItemDto[] = []
    const toUpdate: WordProgressSyncItemDto[] = []

    for (const wordProgress of wordProgresses) {
      const existing = existingProgressMap.get(wordProgress.vocabId)

      if (!existing) {
        toCreate.push(wordProgress)
      } else if (
        wordProgress.lastReviewed > existing.lastReviewed.getTime() &&
        wordProgress.reviewLevel >= existing.reviewLevel
      ) {
        toUpdate.push(wordProgress)
      }
      // Skip if:
      // - existing.lastReviewed >= new lastReviewed (no update needed), OR
      // - new reviewLevel < existing reviewLevel (prevent downgrading)
    }

    return { toCreate, toUpdate }
  }

  /**
   * PULL: Get updated word progress data with pagination
   * Returns data updated after lastSyncTime (or all if lastSyncTime is null/0)
   */
  async pullWordProgress(userId: string, dto: PullWordProgressDto) {
    const { lastSyncTime, page = 1, limit = 50 } = dto
    const where: any = {
      userId,
    }

    // If lastSyncTime is provided, only get changes after that time
    // Otherwise, return all records (full sync for first time login)
    // Use lastReviewed to determine what's been updated (since that's what changes when user reviews)
    // Convert timestamp to Date for database query
    if (lastSyncTime) {
      where.lastReviewed = {
        gt: new Date(lastSyncTime),
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit
    const total = await this.prisma.userWordProgress.count({ where })

    // Get paginated data with vocabulary and quiz information
    const progressRecords = await this.prisma.userWordProgress.findMany({
      where,
      select: {
        userId: true,
        vocabId: true,
        reviewLevel: true,
        isIgnored: true,
        lastReviewed: true,
        nextReview: true,
        correctCount: true,
        totalAttempts: true,
        vocab: {
          select: {
            korean: true,
            hanja: true,
            vietnamese: true,
            pronunciation: true,
            example: true,
            exampleTranslation: true,
            quizQuestions: {
              select: {
                question: true,
                questionTranslation: true,
                options: true,
                correctAnswer: true,
                explanation: true,
              },
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        },
      },
      orderBy: {
        lastReviewed: 'asc', // Order by lastReviewed to ensure consistent pagination
      },
      skip,
      take: limit,
    })

    // Transform to response format: flatten vocab fields and convert dates to timestamps
    const data = progressRecords.map(
      ({ vocab, lastReviewed, nextReview, ...record }) => ({
        ...record,
        lastReviewed: lastReviewed.getTime(),
        nextReview: nextReview.getTime(),
        korean: vocab.korean,
        hanja: vocab.hanja,
        vietnamese: vocab.vietnamese,
        pronunciation: vocab.pronunciation,
        example: vocab.example,
        example_translation: vocab.exampleTranslation,
        quiz: vocab.quizQuestions.map(
          ({ questionTranslation, correctAnswer, ...q }) => ({
            ...q,
            question_translation: questionTranslation,
            correct_answer: correctAnswer,
          }),
        ),
      }),
    )

    const totalPages = Math.ceil(total / limit)
    const hasMore = page < totalPages

    return {
      data,
      page,
      limit,
      total,
      totalPages,
      hasMore,
    }
  }
}
