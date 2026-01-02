import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/prisma.service'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async userInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    })
    return user
  }
}
