import { JwtDecoded, JwtUser } from '@/shared/decorators'
import { JwtAuthGuard } from '@/shared/guard/auth.guard'
import { AdminGuard } from '@/shared/guard'
import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger'
import { UserService } from './user.service'
import {
  SearchUsersDto,
  UpdateUserRoleDto,
  UsersListResponseDto,
  UserResponseDto,
  CreateUserDto,
} from './dto/user.dto'

@ApiBearerAuth()
@Controller('users')
@ApiTags('Users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto)
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user info' })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  info(@JwtUser() { userId }: JwtDecoded) {
    return this.userService.userInfo(userId)
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Search and list users (Admin only)' })
  @ApiQuery({ name: 'query', required: false, description: 'Search query (email or name)' })
  @ApiQuery({ name: 'role', required: false, enum: ['ADMIN', 'SALE', 'MEMBER'], description: 'Filter by role' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'perPage', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: UsersListResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  searchUsers(@Query() query: SearchUsersDto) {
    return this.userService.searchUsers(query)
  }

  @Put(':id/role')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateUserRole(@Param('id') userId: string, @Body() dto: UpdateUserRoleDto) {
    return this.userService.updateUserRole(userId, dto)
  }
}
