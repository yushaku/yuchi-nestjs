import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export type JwtDecoded = {
  userId: string
  role: string
  subscriptionEndDate?: number | null // Unix timestamp in milliseconds, null for lifetime subscriptions
}

export const JwtUser = createParamDecorator(
  (key: keyof JwtDecoded, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user as JwtDecoded
    return key ? user?.[key] : user
  },
)
