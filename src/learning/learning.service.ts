import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/prisma.service'
import { LearningGroupDto, CategoryDto } from './dto/learning.dto'

@Injectable()
export class LearningService {
  constructor(private prisma: PrismaService) {}

  async getAllLearningGroups(): Promise<LearningGroupDto[]> {
    return this.prisma.learningGroup.findMany({
      select: {
        id: true,
        name: true,
        icon: true,
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
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        topikLevel: 'asc',
      },
    })
  }
}
