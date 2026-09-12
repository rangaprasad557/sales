import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.customersService.findAll(search);
    return {
      status: 'success',
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.customersService.findById(id);
    return {
      status: 'success',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      creditLimit?: string;
      notes?: string;
    },
  ) {
    const data = await this.customersService.create(body);
    return {
      status: 'success',
      message: 'Customer created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const data = await this.customersService.update(id, body);
    return {
      status: 'success',
      message: 'Customer updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    const result = await this.customersService.delete(id);
    return {
      status: 'success',
      message: result.message,
    };
  }
}
