import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin', 'auditor')
  async listUsers() {
    const userList = await this.usersService.listUsers();
    return {
      status: 'success',
      data: userList,
    };
  }

  @Patch(':id/role')
  @Roles('admin')
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: string,
  ) {
    if (!['admin', 'salesperson', 'auditor'].includes(role)) {
      throw new BadRequestException("Role must be one of: 'admin', 'salesperson', 'auditor'");
    }
    const updated = await this.usersService.updateRole(id, role as any);
    return {
      status: 'success',
      message: `User role updated to ${role}`,
      data: updated,
    };
  }
}
