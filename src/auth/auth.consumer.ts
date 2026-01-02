import { QUEUE_LIST } from '@/shared/constant'
import { MailerService } from '@nestjs-modules/mailer'
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import { Job } from 'bullmq'

@Processor(QUEUE_LIST.AUTH)
export class AuthConsumer extends WorkerHost {
  SERVER_URL = 'localhost:8080'

  constructor(
    private mailer: MailerService,
    private config: ConfigService,
  ) {
    super()
    this.SERVER_URL = this.config.get('SERVER_URL')
  }

  async process(job: Job) {
    switch (job.name) {
      case 'SEND_VERIFY_EMAIL': {
        const { email, token, name } = job.data
        const url = `${this.SERVER_URL}/auth/verify?token=${token}`

        console.log({
          url,
          email,
        })

        await this.mailer.sendMail({
          to: email,
          from: '"Support Team" <support@example.com>',
          subject: 'Invite You into openai my team',
          template: './verify',
          context: {
            name: name || email.split('@')[0],
            email,
            url,
          },
        })

        break
      }

      default:
        break
    }
  }
}
