import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { LearningService } from './learning.service'
import { LearningGroupDto } from './dto/learning.dto'
import { ResponseDTO } from '@/shared/dto/response.dto'
import { ApiOkResponseDTO } from '@/shared/decorators'

@Controller('learning')
@ApiTags('learning')
export class LearningController {
  constructor(private learningService: LearningService) {}

  @Get('groups')
  @ApiOperation({ summary: 'Get all learning groups' })
  @ApiOkResponseDTO({ data: [LearningGroupDto] })
  async getAllLearningGroups(): Promise<ResponseDTO<LearningGroupDto[]>> {
    const groups = await this.learningService.getAllLearningGroups()
    return new ResponseDTO({ data: groups })
  }
}
