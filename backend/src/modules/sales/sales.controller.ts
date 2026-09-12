import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SalesService } from './sales.service';
import { SimulateSaleDto } from './dto/simulate-sale.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  /**
   * Simulate lot allocation and profit calculation (public or authenticated)
   * Declared before any dynamic parameterized routes
   */
  @Post('simulate')
  async simulateSale(@Body() dto: SimulateSaleDto) {
    return await this.salesService.simulate(dto);
  }

  /**
   * Execute and persist a sale, updating inventory lots atomically
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createSale(@Body() dto: CreateSaleDto, @Request() req: any) {
    const userId = req.user?.id;
    return await this.salesService.create(dto, userId);
  }

  /**
   * List recent sales invoices
   */
  @Get()
  async getSales(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 50;
    const off = offset ? parseInt(offset, 10) : 0;
    const salesList = await this.salesService.findAll(lim, off);
    return {
      status: 'success',
      count: salesList.length,
      data: salesList,
      sales: salesList,
    };
  }

  /**
   * Get complete sale invoice details by ID
   */
  @Get(':id')
  async getSaleById(@Param('id', ParseIntPipe) id: number) {
    const sale = await this.salesService.findById(id);
    return {
      status: 'success',
      data: sale,
      sale,
    };
  }
}
