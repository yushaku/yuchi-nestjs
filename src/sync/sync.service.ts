import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/prisma.service'
import {
  WordProgressSyncItemDto,
  PushWordProgressDto,
  PushWordProgressResponseDto,
  PullWordProgressDto,
  PullWordProgressResponseDto,
} from './dto/sync.dto'

@Injectable()
export class SyncService {
  constructor(private prisma: PrismaService) {}

  /**
   * Upsert word progress (create or update)
   * Converts timestamp (number) to Date for database storage
   */
  private async upsertProgress(
    userId: string,
    change: WordProgressSyncItemDto,
  ): Promise<void> {
    await this.prisma.userWordProgress.upsert({
      where: {
        userId_vocabId: {
          userId,
          vocabId: change.vocabId,
        },
      },
      create: {
        userId,
        vocabId: change.vocabId,
        reviewLevel: change.reviewLevel,
        isIgnored: change.isIgnored,
        lastReviewed: new Date(change.lastReviewed),
        nextReview: new Date(change.nextReview),
        correctCount: change.correctCount,
        totalAttempts: change.totalAttempts,
      },
      update: {
        reviewLevel: change.reviewLevel,
        isIgnored: change.isIgnored,
        lastReviewed: new Date(change.lastReviewed),
        nextReview: new Date(change.nextReview),
        correctCount: change.correctCount,
        totalAttempts: change.totalAttempts,
      },
    })
  }

  /**
   * PUSH: Receive pending sync data from mobile app
   * Mobile app sends data from pending_sync_ids table
   */
  async pushWordProgress(
    userId: string,
    dto: PushWordProgressDto,
  ): Promise<PushWordProgressResponseDto> {
    const syncedAt = Date.now()

    // Extract all unique vocabIds
    const vocabIds = [...new Set(dto.wordProgresses.map((wp) => wp.vocabId))]

    // Batch check all vocabIds in one query (avoid N+1 problem)
    const validVocabs = await this.prisma.vocabulary.findMany({
      where: {
        id: { in: vocabIds },
      },
      select: { id: true },
    })

    // Create Set for O(1) lookup
    const validVocabSet = new Set(validVocabs.map((v) => v.id))

    // Filter and process only valid word progresses
    const validWordProgresses = dto.wordProgresses.filter((wp) =>
      validVocabSet.has(wp.vocabId),
    )

    // Batch upsert all valid progresses
    // Use Promise.all for parallel execution (faster than sequential)
    await Promise.all(
      validWordProgresses.map((wordProgress) =>
        this.upsertProgress(userId, wordProgress),
      ),
    )

    return {
      success: true,
      syncedCount: validWordProgresses.length,
      syncedAt,
    }
  }

  /**
   * PULL: Get updated word progress data with pagination
   * Returns data updated after lastSyncTime (or all if lastSyncTime is null/0)
   */
  async pullWordProgress(
    userId: string,
    dto: PullWordProgressDto,
  ): Promise<PullWordProgressResponseDto> {
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

    // Get paginated data
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
      },
      orderBy: {
        lastReviewed: 'asc', // Order by lastReviewed to ensure consistent pagination
      },
      skip,
      take: limit,
    })

    // Convert Date to timestamp (number) for response
    const data = progressRecords.map((record) => ({
      userId: record.userId,
      vocabId: record.vocabId,
      reviewLevel: record.reviewLevel,
      isIgnored: record.isIgnored,
      lastReviewed: record.lastReviewed.getTime(),
      nextReview: record.nextReview.getTime(),
      correctCount: record.correctCount,
      totalAttempts: record.totalAttempts,
    }))

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
