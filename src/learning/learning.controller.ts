import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  UseGuards,
  Param,
} from '@nestjs/common'
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger'
import { LearningService } from './learning.service'
import {
  LearningGroupDto,
  CategoryDto,
  VocabularyDto,
  QuizQuestionDto,
  BatchResponseDto,
  BatchDeleteResponseDto,
} from './dto/learning.dto'
import { ResponseDTO } from '@/shared/dto/response.dto'
import { ApiOkResponseDTO } from '@/shared/decorators'
import { AdminGuard } from '@/shared/guard'
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

@Controller('learning')
@ApiTags('learning')
export class LearningController {
  constructor(private learningService: LearningService) {}

  @Get('groups')
  @ApiOperation({ summary: 'Get all learning groups' })
  @ApiOkResponseDTO({ data: [LearningGroupDto] })
  @ApiResponse({
    status: 200,
    description: 'Learning groups retrieved successfully',
  })
  async getAllLearningGroups(): Promise<ResponseDTO<LearningGroupDto[]>> {
    const groups = await this.learningService.getAllLearningGroups()
    return new ResponseDTO({ data: groups })
  }

  @Get('groups/:groupId/categories')
  @ApiOperation({ summary: 'Get categories by group ID' })
  @ApiParam({ name: 'groupId', description: 'Learning group ID' })
  @ApiOkResponseDTO({ data: [CategoryDto] })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Learning group not found' })
  async getCategoriesByGroupId(
    @Param('groupId') groupId: string,
  ): Promise<ResponseDTO<CategoryDto[]>> {
    const categories =
      await this.learningService.getCategoriesByGroupId(groupId)
    return new ResponseDTO({ data: categories })
  }

  @Get('categories/:categoryId/vocabularies')
  @ApiOperation({ summary: 'Get vocabularies by category ID' })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiOkResponseDTO({ data: [VocabularyDto] })
  @ApiResponse({
    status: 200,
    description: 'Vocabularies retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async getVocabByCategoryId(
    @Param('categoryId') categoryId: string,
  ): Promise<ResponseDTO<VocabularyDto[]>> {
    const vocab = await this.learningService.getVocabByCategoryId(categoryId)
    return new ResponseDTO({ data: vocab })
  }

  @Get('vocabularies/:vocabId/quiz-questions')
  @ApiOperation({ summary: 'Get quiz questions by vocab ID' })
  @ApiParam({ name: 'vocabId', description: 'Vocabulary ID' })
  @ApiOkResponseDTO({ data: [QuizQuestionDto] })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions retrieved successfully',
  })
  @ApiNotFoundResponse({ description: 'Vocabulary not found' })
  async getQuizzesByVocabId(
    @Param('vocabId') vocabId: string,
  ): Promise<ResponseDTO<QuizQuestionDto[]>> {
    const quizzes = await this.learningService.getQuizzesByVocabId(vocabId)
    return new ResponseDTO({ data: quizzes })
  }

  // LearningGroup endpoints
  @Post('groups')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create learning groups (Admin only)' })
  @ApiBody({ type: BatchCreateLearningGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Learning groups created successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchCreateLearningGroups(
    @Body() dto: BatchCreateLearningGroupDto,
  ): Promise<ResponseDTO<BatchResponseDto<LearningGroupDto>>> {
    const result = await this.learningService.batchCreateLearningGroups(dto)
    return new ResponseDTO({ data: result, statusCode: 201 })
  }

  @Put('groups')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update learning groups (Admin only)' })
  @ApiBody({ type: BatchUpdateLearningGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Learning groups updated successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'One or more learning groups not found' })
  async batchUpdateLearningGroups(
    @Body() dto: BatchUpdateLearningGroupDto,
  ): Promise<ResponseDTO<BatchResponseDto<LearningGroupDto>>> {
    const result = await this.learningService.batchUpdateLearningGroups(dto)
    return new ResponseDTO({ data: result })
  }

  @Delete('groups')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete learning groups (Admin only)' })
  @ApiBody({ type: BatchDeleteLearningGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Learning groups deleted successfully',
    type: BatchDeleteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchDeleteLearningGroups(
    @Body() dto: BatchDeleteLearningGroupDto,
  ): Promise<ResponseDTO<BatchDeleteResponseDto>> {
    const result = await this.learningService.batchDeleteLearningGroups(dto)
    return new ResponseDTO({ data: result })
  }

  // Category endpoints
  @Post('categories')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create categories (Admin only)' })
  @ApiBody({ type: BatchCreateCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Categories created successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchCreateCategories(
    @Body() dto: BatchCreateCategoryDto,
  ): Promise<ResponseDTO<BatchResponseDto<CategoryDto>>> {
    const result = await this.learningService.batchCreateCategories(dto)
    return new ResponseDTO({ data: result, statusCode: 201 })
  }

  @Put('categories')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update categories (Admin only)' })
  @ApiBody({ type: BatchUpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Categories updated successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'One or more categories not found' })
  async batchUpdateCategories(
    @Body() dto: BatchUpdateCategoryDto,
  ): Promise<ResponseDTO<BatchResponseDto<CategoryDto>>> {
    const result = await this.learningService.batchUpdateCategories(dto)
    return new ResponseDTO({ data: result })
  }

  @Delete('categories')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete categories (Admin only)' })
  @ApiBody({ type: BatchDeleteCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Categories deleted successfully',
    type: BatchDeleteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchDeleteCategories(
    @Body() dto: BatchDeleteCategoryDto,
  ): Promise<ResponseDTO<BatchDeleteResponseDto>> {
    const result = await this.learningService.batchDeleteCategories(dto)
    return new ResponseDTO({ data: result })
  }

  // Vocabulary endpoints
  @Post('vocabularies')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create vocabularies (Admin only)' })
  @ApiBody({ type: BatchCreateVocabularyDto })
  @ApiResponse({
    status: 201,
    description: 'Vocabularies created successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchCreateVocabularies(
    @Body() dto: BatchCreateVocabularyDto,
  ): Promise<ResponseDTO<BatchResponseDto<VocabularyDto>>> {
    const result = await this.learningService.batchCreateVocabularies(dto)
    return new ResponseDTO({ data: result, statusCode: 201 })
  }

  @Put('vocabularies')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vocabularies (Admin only)' })
  @ApiBody({ type: BatchUpdateVocabularyDto })
  @ApiResponse({
    status: 200,
    description: 'Vocabularies updated successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'One or more vocabularies not found' })
  async batchUpdateVocabularies(
    @Body() dto: BatchUpdateVocabularyDto,
  ): Promise<ResponseDTO<BatchResponseDto<VocabularyDto>>> {
    const result = await this.learningService.batchUpdateVocabularies(dto)
    return new ResponseDTO({ data: result })
  }

  @Delete('vocabularies')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete vocabularies (Admin only)' })
  @ApiBody({ type: BatchDeleteVocabularyDto })
  @ApiResponse({
    status: 200,
    description: 'Vocabularies deleted successfully',
    type: BatchDeleteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchDeleteVocabularies(
    @Body() dto: BatchDeleteVocabularyDto,
  ): Promise<ResponseDTO<BatchDeleteResponseDto>> {
    const result = await this.learningService.batchDeleteVocabularies(dto)
    return new ResponseDTO({ data: result })
  }

  // QuizQuestion endpoints
  @Post('quiz-questions')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create quiz questions (Admin only)' })
  @ApiBody({ type: BatchCreateQuizQuestionDto })
  @ApiResponse({
    status: 201,
    description: 'Quiz questions created successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchCreateQuizQuestions(
    @Body() dto: BatchCreateQuizQuestionDto,
  ): Promise<ResponseDTO<BatchResponseDto<QuizQuestionDto>>> {
    const result = await this.learningService.batchCreateQuizQuestions(dto)
    return new ResponseDTO({ data: result, statusCode: 201 })
  }

  @Put('quiz-questions')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update quiz questions (Admin only)' })
  @ApiBody({ type: BatchUpdateQuizQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions updated successfully',
    type: BatchResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'One or more quiz questions not found' })
  async batchUpdateQuizQuestions(
    @Body() dto: BatchUpdateQuizQuestionDto,
  ): Promise<ResponseDTO<BatchResponseDto<QuizQuestionDto>>> {
    const result = await this.learningService.batchUpdateQuizQuestions(dto)
    return new ResponseDTO({ data: result })
  }

  @Delete('quiz-questions')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete quiz questions (Admin only)' })
  @ApiBody({ type: BatchDeleteQuizQuestionDto })
  @ApiResponse({
    status: 200,
    description: 'Quiz questions deleted successfully',
    type: BatchDeleteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async batchDeleteQuizQuestions(
    @Body() dto: BatchDeleteQuizQuestionDto,
  ): Promise<ResponseDTO<BatchDeleteResponseDto>> {
    const result = await this.learningService.batchDeleteQuizQuestions(dto)
    return new ResponseDTO({ data: result })
  }
}
