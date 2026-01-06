import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '@/shared/prisma.service'
import { BloomFilter } from '@/shared/bloom-filter'
import { CreateSubscriptionCodeDto } from './dto/create-subscription-code.dto'
import {
  SearchSubscriptionCodesDto,
  SubscriptionCodesListResponseDto,
} from './dto/subscription-code.dto'
import { CodeStatus, PlanType } from '../../generated/prisma/client'

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionService.name)
  private bloomFilter: BloomFilter
  private readonly bloomFilterSize = 100000 // Can handle ~10k items with ~1% false positive rate
  private readonly bloomFilterHashCount = 3

  constructor(private prisma: PrismaService) {
    // Initialize Bloom Filter with reasonable size for subscription codes
    this.bloomFilter = new BloomFilter(
      this.bloomFilterSize,
      this.bloomFilterHashCount,
    )
  }

  async onModuleInit() {
    // Pre-populate Bloom Filter with existing codes for better performance
    try {
      const existingCodes = await this.prisma.subscriptionCode.findMany({
        select: { code: true },
      })
      this.bloomFilter.addBulk(existingCodes.map((c) => c.code))
      this.logger.log(
        `Bloom Filter initialized with ${existingCodes.length} existing codes`,
      )
    } catch (error) {
      this.logger.warn('Failed to pre-populate Bloom Filter', error)
      // Continue without pre-population - filter will populate as codes are created
    }
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string
    let attempts = 0
    const maxAttempts = 20 // Increased since Bloom Filter may cause more retries

    while (attempts < maxAttempts) {
      // Generate code: PREFIX + timestamp + random alphanumeric
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 6).toUpperCase()
      code = `PROMO${timestamp}${random}`

      // Fast check with Bloom Filter
      // Bloom Filters have NO false negatives: if it says "doesn't exist", it definitely doesn't
      // Bloom Filters CAN have false positives: if it says "might exist", it might not actually exist
      if (!this.bloomFilter.mightContain(code)) {
        // Bloom Filter says it definitely doesn't exist (no false negatives possible)
        // Add to filter and return - no DB check needed!
        this.bloomFilter.add(code)
        return code
      }

      // Bloom Filter says it might exist (could be false positive)
      // Accept the false positive and try again - skip DB check for performance
      attempts++
    }

    throw new ConflictException(
      'Failed to generate unique code after multiple attempts',
    )
  }

  async createSubscriptionCode(dto: CreateSubscriptionCodeDto) {
    const count = dto.count || 1
    const expiresAtDate = dto.expiresAt ? new Date(dto.expiresAt) : null

    // If count is 1, return single code (backward compatible)
    if (count === 1) {
      const code = await this.generateUniqueCode()
      const created = await this.prisma.subscriptionCode.create({
        data: {
          code,
          planType: dto.planType,
          expiresAt: expiresAtDate,
          note: dto.note || null,
        },
      })
      // Code already added to Bloom Filter in generateUniqueCode
      return created
    }

    // Batch create for count > 1
    // Generate all unique codes first
    const codes: string[] = []
    for (let i = 0; i < count; i++) {
      const code = await this.generateUniqueCode()
      codes.push(code)
    }

    // Create all codes in a transaction
    const createdCodes = await this.prisma.$transaction(
      codes.map((code) =>
        this.prisma.subscriptionCode.create({
          data: {
            code,
            planType: dto.planType,
            expiresAt: expiresAtDate,
            note: dto.note || null,
          },
        }),
      ),
    )

    // Add all created codes to Bloom Filter
    this.bloomFilter.addBulk(createdCodes.map((c) => c.code))

    return {
      created: createdCodes.length,
      codes: createdCodes,
    }
  }

  async searchSubscriptionCodes(
    dto: SearchSubscriptionCodesDto,
  ): Promise<SubscriptionCodesListResponseDto> {
    const { query, planType, status, skip, perPage, page } = dto

    // Build where clause
    const where: any = {}

    if (planType) {
      where.planType = planType
    }

    if (status) {
      where.status = status
    }

    if (query) {
      where.OR = [
        { code: { contains: query, mode: 'insensitive' } },
        { note: { contains: query, mode: 'insensitive' } },
      ]
    }

    // Get total count
    const total = await this.prisma.subscriptionCode.count({ where })

    // Get codes with pagination
    const codes = await this.prisma.subscriptionCode.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    })

    const totalPages = Math.ceil(total / perPage)

    return {
      codes,
      total,
      page,
      perPage,
      totalPages,
    }
  }

  async getSubscriptionCodeById(id: string) {
    const code = await this.prisma.subscriptionCode.findUnique({
      where: { id },
    })

    if (!code) {
      throw new NotFoundException('Subscription code not found')
    }

    return code
  }

  async updateSubscriptionCode(
    id: string,
    data: {
      code?: string
      planType?: PlanType
      duration?: number | null
      expiresAt?: Date | null
      note?: string | null
      status?: CodeStatus
    },
  ) {
    const code = await this.prisma.subscriptionCode.findUnique({
      where: { id },
    })

    if (!code) {
      throw new NotFoundException('Subscription code not found')
    }

    // Check if code is being updated and if it conflicts
    if (data.code && data.code !== code.code) {
      // Fast check with Bloom Filter first
      if (this.bloomFilter.mightContain(data.code)) {
        // Might exist, check DB
        const existingCode = await this.prisma.subscriptionCode.findUnique({
          where: { code: data.code },
        })

        if (existingCode) {
          throw new ConflictException('Subscription code already exists')
        }
      }
      // If Bloom Filter says it doesn't exist, it's safe (false positive accepted)
      // Add new code to Bloom Filter
      this.bloomFilter.add(data.code)
    }

    // Can't update used codes
    if (code.status === CodeStatus.USED) {
      throw new BadRequestException('Cannot update a used subscription code')
    }

    // Build update data with proper types
    const updateData: {
      code?: string
      planType?: PlanType
      duration?: number | null
      expiresAt?: Date | null
      note?: string | null
      status?: CodeStatus
    } = {}

    if (data.code !== undefined) updateData.code = data.code
    if (data.planType !== undefined) updateData.planType = data.planType
    if (data.duration !== undefined) updateData.duration = data.duration
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt
    if (data.note !== undefined) updateData.note = data.note
    if (data.status !== undefined) updateData.status = data.status

    return this.prisma.subscriptionCode.update({
      where: { id },
      data: updateData,
    })
  }

  async deleteSubscriptionCode(id: string) {
    const code = await this.prisma.subscriptionCode.findUnique({
      where: { id },
    })

    if (!code) {
      throw new NotFoundException('Subscription code not found')
    }

    // Can't delete used codes
    if (code.status === CodeStatus.USED) {
      throw new BadRequestException('Cannot delete a used subscription code')
    }

    return this.prisma.subscriptionCode.delete({
      where: { id },
    })
  }
}
