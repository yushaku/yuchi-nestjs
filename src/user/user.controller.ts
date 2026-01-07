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
@ApiTags('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiResponse({ type: UserResponseDto })
  createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto)
  }

  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user info' })
  info(@JwtUser() { userId }: JwtDecoded) {
    return this.userService.userInfo(userId)
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Search and list users (Admin only)' })
  @ApiResponse({ type: UsersListResponseDto })
  searchUsers(@Query() query: SearchUsersDto) {
    return this.userService.searchUsers(query)
  }

  @Put(':id/role')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiResponse({ type: UserResponseDto })
  updateUserRole(@Param('id') userId: string, @Body() dto: UpdateUserRoleDto) {
    return this.userService.updateUserRole(userId, dto)
  }
}
