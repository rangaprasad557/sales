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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/create-product.dto';
import { SearchProductQueryDto, SemanticSearchDto } from './dto/search-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(@Query() query: SearchProductQueryDto) {
    const data = await this.productsService.findAll(query);
    return {
      status: 'success',
      count: data.length,
      data,
    };
  }

  @Get('search')
  async fuzzySearch(@Query('q') query: string) {
    const data = await this.productsService.fuzzySearch(query || '');
    return {
      status: 'success',
      count: data.length,
      data,
    };
  }

  @Post('semantic-search')
  @HttpCode(HttpStatus.OK)
  async semanticSearch(@Body() dto: SemanticSearchDto) {
    const data = await this.productsService.semanticSearch(dto);
    return {
      status: 'success',
      count: data.length,
      data,
    };
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    const data = await this.productsService.findById(id);
    return {
      status: 'success',
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateProductDto) {
    const data = await this.productsService.create(dto);
    return {
      status: 'success',
      message: 'Product created successfully',
      data,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ) {
    const data = await this.productsService.update(id, dto);
    return {
      status: 'success',
      message: 'Product updated successfully',
      data,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    const result = await this.productsService.delete(id);
    return {
      status: 'success',
      message: result.message,
    };
  }
}
