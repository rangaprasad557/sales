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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Query('search') search?: string) {
    const data = await this.categoriesService.findAll(search);
    return {
      status: 'success',
      data,
    };
  }

  @Get('tree')
  async findTree() {
    const data = await this.categoriesService.findTree();
    return {
      status: 'success',
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.categoriesService.findById(id);
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
      slug?: string;
      parentId?: number;
      icon?: string;
      description?: string;
    },
  ) {
    const data = await this.categoriesService.create(body);
    return {
      status: 'success',
      message: 'Category created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    const data = await this.categoriesService.update(id, body);
    return {
      status: 'success',
      message: 'Category updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    const result = await this.categoriesService.delete(id);
    return {
      status: 'success',
      message: result.message,
    };
  }
}
