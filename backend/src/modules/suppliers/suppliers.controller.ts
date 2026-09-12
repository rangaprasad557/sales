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
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.suppliersService.findAll(search);
    return {
      status: 'success',
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.suppliersService.findById(id);
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
      contactPerson?: string;
      phone?: string;
      email?: string;
      address?: string;
      paymentTerms?: string;
      notes?: string;
    },
  ) {
    const data = await this.suppliersService.create(body);
    return {
      status: 'success',
      message: 'Supplier created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const data = await this.suppliersService.update(id, body);
    return {
      status: 'success',
      message: 'Supplier updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    const result = await this.suppliersService.delete(id);
    return {
      status: 'success',
      message: result.message,
    };
  }
}
