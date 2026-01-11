import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { FastifyRequest } from 'fastify'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { TOKEN } from '../constant'

type JwtPayload = {
  userId: string
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private config: ConfigService) {
    super({
      secretOrKey: config.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: FastifyRequest) => {
          const authorization = request.headers.authorization || ''
          let access_token = authorization.replace('Bearer ', '')

          if (!access_token) {
            access_token = request.cookies?.[TOKEN.ACCESS]
          }
          return access_token
        },
      ]),
    })
  }

  async validate(data: JwtPayload) {
    return data
  }
}
