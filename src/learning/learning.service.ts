import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '@/shared/prisma.service'
import { JwtDecoded } from '@/shared/decorators/JwtUser.decorator'
import {
  LearningGroupDto,
  CategoryDto,
  VocabularyDto,
  QuizQuestionDto,
  BatchResponseDto,
  BatchDeleteResponseDto,
} from './dto/learning.dto'
import {
  BatchCreateLearningGroupDto,
  BatchUpdateLearningGroupDto,
  BatchDeleteLearningGroupDto,
} from './dto/batch-learning-group.dto'
import {
  BatchCreateCategoryDto,
  BatchUpdateCategoryDto,
  BatchDeleteCategoryDto,
} from './dto/batch-category.dto'
import {
  BatchCreateVocabularyDto,
  BatchUpdateVocabularyDto,
  BatchDeleteVocabularyDto,
} from './dto/batch-vocabulary.dto'
import {
  BatchCreateQuizQuestionDto,
  BatchUpdateQuizQuestionDto,
  BatchDeleteQuizQuestionDto,
} from './dto/batch-quiz-question.dto'

@Injectable()
export class LearningService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user has active subscription based on JWT subscriptionEndDate
   * @param subscriptionEndDate Unix timestamp in milliseconds, or null
   * @returns true if subscription is active, false otherwise
   */
  private validateSubscription(
    subscriptionEndDate: number | null | undefined,
  ): void {
    // No subscription info in JWT means no active subscription
    if (subscriptionEndDate === null || subscriptionEndDate === undefined) {
      throw new ForbiddenException(
        'Active subscription required to access this content',
      )
    }

    // subscriptionEndDate is Unix timestamp in milliseconds
    // Check if it's in the future (lifetime subscriptions use far future timestamp)
    const now = Date.now()
    if (subscriptionEndDate <= now) {
      throw new ForbiddenException(
        'Active subscription required to access this content',
      )
    }
  }

  async getAllLearningGroups(): Promise<LearningGroupDto[]> {
    return this.prisma.learningGroup.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
        order: true,
        topikLevel: true,
        createdAt: true,
        updatedAt: true,
        categories: {
          select: {
            id: true,
            name: true,
            description: true,
            icon: true,
            order: true,
            topikLevel: true,
            isNeedPremium: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: [
        {
          topikLevel: 'asc',
        },
        {
          order: 'asc',
        },
      ],
    })
  }

  async getCategoriesByGroupId(groupId: string): Promise<CategoryDto[]> {
    return this.prisma.category.findMany({
      where: { groupId },
      orderBy: { order: 'asc' },
    })
  }

  async getVocabByCategoryId(
    categoryId: string,
    user?: JwtDecoded | null,
  ): Promise<VocabularyDto[]> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true, isNeedPremium: true },
    })

    if (!category) {
      throw new NotFoundException('Category not found')
    }

    // Free category: accessible to everyone
    if (!category.isNeedPremium) {
      return this.prisma.vocabulary.findMany({
        where: { categoryId },
        orderBy: { korean: 'asc' },
      })
    }

    // Premium category: require login + active subscription (admin bypass)
    if (!user) {
      throw new UnauthorizedException(
        'Authentication required for this category',
      )
    }

    if (user.role === 'ADMIN') {
      return this.prisma.vocabulary.findMany({
        where: { categoryId },
        orderBy: { korean: 'asc' },
      })
    }

    this.validateSubscription(user.subscriptionEndDate)

    return this.prisma.vocabulary.findMany({
      where: { categoryId },
      orderBy: { korean: 'asc' },
    })
  }

  async getQuizzesByVocabId(
    VocabularyId: string,
    user?: JwtDecoded | null,
  ): Promise<QuizQuestionDto[]> {
    const vocab = await this.prisma.vocabulary.findUnique({
      where: { id: VocabularyId },
      select: {
        id: true,
        category: {
          select: {
            id: true,
            isNeedPremium: true,
          },
        },
      },
    })

    if (!vocab) {
      throw new NotFoundException('Vocabulary not found')
    }

    const isPremium = vocab.category?.isNeedPremium ?? false

    if (isPremium) {
      if (!user) {
        throw new UnauthorizedException(
          'Authentication required for this vocabulary',
        )
      }

      if (user.role !== 'ADMIN') {
        this.validateSubscription(user.subscriptionEndDate)
      }
    }

    return this.prisma.quizQuestion.findMany({
      where: { VocabularyId },
    })
  }

  // LearningGroup batch operations
  async batchCreateLearningGroups(
    dto: BatchCreateLearningGroupDto,
  ): Promise<BatchResponseDto<LearningGroupDto>> {
    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.learningGroup.create({
          data: {
            name: item.name,
            icon: item.icon ?? null,
            order: item.order ?? 0,
            topikLevel: item.topikLevel,
          },
          select: {
            id: true,
            name: true,
            icon: true,
            order: true,
            topikLevel: true,
            createdAt: true,
            updatedAt: true,
            categories: true,
          },
        }),
      ),
    )

    return {
      count: created.length,
      items: created.map((group) => ({ ...group, categories: [] })),
    }
  }

  async batchUpdateLearningGroups(
    dto: BatchUpdateLearningGroupDto,
  ): Promise<BatchResponseDto<LearningGroupDto>> {
    // Validate all IDs exist
    const ids = dto.items.map((item) => item.id)
    const existing = await this.prisma.learningGroup.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    const existingIds = new Set(existing.map((g) => g.id))
    const missingIds = ids.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Learning groups not found: ${missingIds.join(', ')}`,
      )
    }

    const updated = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.learningGroup.update({
          where: { id: item.id },
          data: {
            ...(item.name !== undefined && { name: item.name }),
            ...(item.icon !== undefined && { icon: item.icon }),
            ...(item.order !== undefined && { order: item.order }),
            ...(item.topikLevel !== undefined && {
              topikLevel: item.topikLevel,
            }),
          },
          select: {
            id: true,
            name: true,
            icon: true,
            order: true,
            topikLevel: true,
            createdAt: true,
            updatedAt: true,
            categories: true,
          },
        }),
      ),
    )

    return {
      count: updated.length,
      items: updated.map((group) => ({ ...group, categories: [] })),
    }
  }

  async batchDeleteLearningGroups(
    dto: BatchDeleteLearningGroupDto,
  ): Promise<BatchDeleteResponseDto> {
    // Check if any groups have categories
    const groupsWithCategories = await this.prisma.learningGroup.findMany({
      where: {
        id: { in: dto.ids },
        categories: { some: {} },
      },
      select: { id: true, name: true },
    })

    if (groupsWithCategories.length > 0) {
      throw new BadRequestException(
        `Cannot delete learning groups with categories: ${groupsWithCategories.map((g) => g.name).join(', ')}`,
      )
    }

    await this.prisma.learningGroup.deleteMany({
      where: { id: { in: dto.ids } },
    })

    return {
      count: dto.ids.length,
      deletedIds: dto.ids,
    }
  }

  // Category batch operations
  async batchCreateCategories(
    dto: BatchCreateCategoryDto,
  ): Promise<BatchResponseDto<CategoryDto>> {
    // Validate groupIds if provided
    const groupIds = dto.items
      .map((item) => item.groupId)
      .filter((id): id is string => id !== null && id !== undefined)

    if (groupIds.length > 0) {
      const uniqueGroupIds = [...new Set(groupIds)]
      const existingGroups = await this.prisma.learningGroup.findMany({
        where: { id: { in: uniqueGroupIds } },
        select: { id: true },
      })

      const existingGroupIds = new Set(existingGroups.map((g) => g.id))
      const missingGroupIds = uniqueGroupIds.filter(
        (id) => !existingGroupIds.has(id),
      )

      if (missingGroupIds.length > 0) {
        throw new NotFoundException(
          `Learning groups not found: ${missingGroupIds.join(', ')}`,
        )
      }
    }

    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.category.create({
          data: {
            name: item.name,
            description: item.description ?? null,
            icon: item.icon ?? null,
            order: item.order ?? 0,
            topikLevel: item.topikLevel ?? null,
            groupId: item.groupId ?? null,
            isNeedPremium: item.isNeedPremium ?? true,
          },
        }),
      ),
    )

    return {
      count: created.length,
      items: created,
    }
  }

  async batchUpdateCategories(
    dto: BatchUpdateCategoryDto,
  ): Promise<BatchResponseDto<CategoryDto>> {
    // Validate all IDs exist
    const ids = dto.items.map((item) => item.id)
    const existing = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    const existingIds = new Set(existing.map((c) => c.id))
    const missingIds = ids.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Categories not found: ${missingIds.join(', ')}`,
      )
    }

    // Validate groupIds if provided
    const groupIds = dto.items
      .map((item) => item.groupId)
      .filter((id): id is string => id !== null && id !== undefined)

    if (groupIds.length > 0) {
      const uniqueGroupIds = [...new Set(groupIds)]
      const existingGroups = await this.prisma.learningGroup.findMany({
        where: { id: { in: uniqueGroupIds } },
        select: { id: true },
      })

      const existingGroupIds = new Set(existingGroups.map((g) => g.id))
      const missingGroupIds = uniqueGroupIds.filter(
        (id) => !existingGroupIds.has(id),
      )

      if (missingGroupIds.length > 0) {
        throw new NotFoundException(
          `Learning groups not found: ${missingGroupIds.join(', ')}`,
        )
      }
    }

    const updated = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: {
            ...(item.name !== undefined && { name: item.name }),
            ...(item.description !== undefined && {
              description: item.description,
            }),
            ...(item.icon !== undefined && { icon: item.icon }),
            ...(item.order !== undefined && { order: item.order }),
            ...(item.topikLevel !== undefined && {
              topikLevel: item.topikLevel,
            }),
            ...(item.groupId !== undefined && { groupId: item.groupId }),
            ...(item.isNeedPremium !== undefined && {
              isNeedPremium: item.isNeedPremium,
            }),
          },
        }),
      ),
    )

    return {
      count: updated.length,
      items: updated,
    }
  }

  async batchDeleteCategories(
    dto: BatchDeleteCategoryDto,
  ): Promise<BatchDeleteResponseDto> {
    // Check if any categories have vocabularies
    const categoriesWithVocab = await this.prisma.category.findMany({
      where: {
        id: { in: dto.ids },
        words: { some: {} },
      },
      select: { id: true, name: true },
    })

    if (categoriesWithVocab.length > 0) {
      throw new BadRequestException(
        `Cannot delete categories with vocabularies: ${categoriesWithVocab.map((c) => c.name).join(', ')}`,
      )
    }

    await this.prisma.category.deleteMany({
      where: { id: { in: dto.ids } },
    })

    return {
      count: dto.ids.length,
      deletedIds: dto.ids,
    }
  }

  // Vocabulary batch operations
  async batchCreateVocabularies(
    dto: BatchCreateVocabularyDto,
  ): Promise<BatchResponseDto<VocabularyDto>> {
    // Validate all categoryIds exist
    const categoryIds = [...new Set(dto.items.map((item) => item.categoryId))]
    const existingCategories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true },
    })

    const existingCategoryIds = new Set(existingCategories.map((c) => c.id))
    const missingCategoryIds = categoryIds.filter(
      (id) => !existingCategoryIds.has(id),
    )

    if (missingCategoryIds.length > 0) {
      throw new NotFoundException(
        `Categories not found: ${missingCategoryIds.join(', ')}`,
      )
    }

    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.vocabulary.create({
          data: {
            korean: item.korean,
            hanja: item.hanja ?? null,
            vietnamese: item.vietnamese,
            pronunciation: item.pronunciation,
            example: item.example ?? null,
            exampleTranslation: item.exampleTranslation ?? null,
            categoryId: item.categoryId,
          },
        }),
      ),
    )

    return {
      count: created.length,
      items: created,
    }
  }

  async batchUpdateVocabularies(
    dto: BatchUpdateVocabularyDto,
  ): Promise<BatchResponseDto<VocabularyDto>> {
    // Validate all IDs exist
    const ids = dto.items.map((item) => item.id)
    const existing = await this.prisma.vocabulary.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    const existingIds = new Set(existing.map((v) => v.id))
    const missingIds = ids.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Vocabularies not found: ${missingIds.join(', ')}`,
      )
    }

    // Validate categoryIds if provided
    const categoryIds = dto.items
      .map((item) => item.categoryId)
      .filter((id): id is string => id !== undefined)

    if (categoryIds.length > 0) {
      const uniqueCategoryIds = [...new Set(categoryIds)]
      const existingCategories = await this.prisma.category.findMany({
        where: { id: { in: uniqueCategoryIds } },
        select: { id: true },
      })

      const existingCategoryIds = new Set(existingCategories.map((c) => c.id))
      const missingCategoryIds = uniqueCategoryIds.filter(
        (id) => !existingCategoryIds.has(id),
      )

      if (missingCategoryIds.length > 0) {
        throw new NotFoundException(
          `Categories not found: ${missingCategoryIds.join(', ')}`,
        )
      }
    }

    const updated = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.vocabulary.update({
          where: { id: item.id },
          data: {
            ...(item.korean !== undefined && { korean: item.korean }),
            ...(item.hanja !== undefined && { hanja: item.hanja }),
            ...(item.vietnamese !== undefined && {
              vietnamese: item.vietnamese,
            }),
            ...(item.pronunciation !== undefined && {
              pronunciation: item.pronunciation,
            }),
            ...(item.example !== undefined && { example: item.example }),
            ...(item.exampleTranslation !== undefined && {
              exampleTranslation: item.exampleTranslation,
            }),
            ...(item.categoryId !== undefined && {
              categoryId: item.categoryId,
            }),
          },
        }),
      ),
    )

    return {
      count: updated.length,
      items: updated,
    }
  }

  async batchDeleteVocabularies(
    dto: BatchDeleteVocabularyDto,
  ): Promise<BatchDeleteResponseDto> {
    // Check if any vocabularies have quiz questions
    const vocabWithQuiz = await this.prisma.vocabulary.findMany({
      where: {
        id: { in: dto.ids },
        quizQuestions: { some: {} },
      },
      select: { id: true, korean: true },
    })

    if (vocabWithQuiz.length > 0) {
      throw new BadRequestException(
        `Cannot delete vocabularies with quiz questions: ${vocabWithQuiz.map((v) => v.korean).join(', ')}`,
      )
    }

    await this.prisma.vocabulary.deleteMany({
      where: { id: { in: dto.ids } },
    })

    return {
      count: dto.ids.length,
      deletedIds: dto.ids,
    }
  }

  // QuizQuestion batch operations
  async batchCreateQuizQuestions(
    dto: BatchCreateQuizQuestionDto,
  ): Promise<BatchResponseDto<QuizQuestionDto>> {
    // Validate all VocabularyIds exist
    const vocabularyIds = [
      ...new Set(dto.items.map((item) => item.VocabularyId)),
    ]
    const existingVocabularies = await this.prisma.vocabulary.findMany({
      where: { id: { in: vocabularyIds } },
      select: { id: true },
    })

    const existingVocabularyIds = new Set(existingVocabularies.map((v) => v.id))
    const missingVocabularyIds = vocabularyIds.filter(
      (id) => !existingVocabularyIds.has(id),
    )

    if (missingVocabularyIds.length > 0) {
      throw new NotFoundException(
        `Vocabularies not found: ${missingVocabularyIds.join(', ')}`,
      )
    }

    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.quizQuestion.create({
          data: {
            question: item.question,
            questionTranslation: item.questionTranslation ?? null,
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation ?? null,
            VocabularyId: item.VocabularyId,
          },
        }),
      ),
    )

    return {
      count: created.length,
      items: created,
    }
  }

  async batchUpdateQuizQuestions(
    dto: BatchUpdateQuizQuestionDto,
  ): Promise<BatchResponseDto<QuizQuestionDto>> {
    // Validate all IDs exist
    const ids = dto.items.map((item) => item.id)
    const existing = await this.prisma.quizQuestion.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    const existingIds = new Set(existing.map((q) => q.id))
    const missingIds = ids.filter((id) => !existingIds.has(id))

    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Quiz questions not found: ${missingIds.join(', ')}`,
      )
    }

    // Validate VocabularyIds if provided
    const vocabularyIds = dto.items
      .map((item) => item.VocabularyId)
      .filter((id): id is string => id !== undefined)

    if (vocabularyIds.length > 0) {
      const uniqueVocabularyIds = [...new Set(vocabularyIds)]
      const existingVocabularies = await this.prisma.vocabulary.findMany({
        where: { id: { in: uniqueVocabularyIds } },
        select: { id: true },
      })

      const existingVocabularyIds = new Set(
        existingVocabularies.map((v) => v.id),
      )
      const missingVocabularyIds = uniqueVocabularyIds.filter(
        (id) => !existingVocabularyIds.has(id),
      )

      if (missingVocabularyIds.length > 0) {
        throw new NotFoundException(
          `Vocabularies not found: ${missingVocabularyIds.join(', ')}`,
        )
      }
    }

    const updated = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.quizQuestion.update({
          where: { id: item.id },
          data: {
            ...(item.question !== undefined && { question: item.question }),
            ...(item.questionTranslation !== undefined && {
              questionTranslation: item.questionTranslation,
            }),
            ...(item.options !== undefined && { options: item.options }),
            ...(item.correctAnswer !== undefined && {
              correctAnswer: item.correctAnswer,
            }),
            ...(item.explanation !== undefined && {
              explanation: item.explanation,
            }),
            ...(item.VocabularyId !== undefined && {
              VocabularyId: item.VocabularyId,
            }),
          },
        }),
      ),
    )

    return {
      count: updated.length,
      items: updated,
    }
  }

  async batchDeleteQuizQuestions(
    dto: BatchDeleteQuizQuestionDto,
  ): Promise<BatchDeleteResponseDto> {
    await this.prisma.quizQuestion.deleteMany({
      where: { id: { in: dto.ids } },
    })

    return {
      count: dto.ids.length,
      deletedIds: dto.ids,
    }
  }
}
