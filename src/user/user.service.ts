import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/shared/prisma.service'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async userInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user
  }
}
